import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { getPool } from './db.js';
import { handleError, StatusError } from './error.js';
import { validateUuid, validateMinMaxLength, } from './validation.js';
import { User, Profile, MinUser, AuthInfo } from 'oi-types/user';

interface HelloResult {
  id: string;
  name: string;
}

export async function hello(req: Request, res: Response) {
  try {
    const session = validateUuid(req.cookies.session, 401);

    const helloResult = await getPool().query<HelloResult>(
      `
      UPDATE sessions
      SET last_used = NOW()
      FROM users
      WHERE sesskey = $1 AND users.id = sessions.uid
      RETURNING users.name, users.id
      `,
      [session]
    );
    if (helloResult.rowCount === 0) {
      res.status(401).send('Session not found');
      return;
    }

    // Expires in 30 days (1000ms/s * 3600s/hr * 24hr/day * 30days)
    const expires = new Date(Date.now() + 1000 * 3600 * 24 * 30);
    res.cookie('session', session, { expires });
    res.send(`${helloResult.rows[0].id}\nHello, ${helloResult.rows[0].name}`);
  } catch (e) {
    handleError(e, res);
  } finally {
    res.end();
  }
}

export async function getMyProfile(req: Request, res: Response) {
  try {
    const session = validateUuid(req.cookies.session, 401);

    const profileResult = await getPool().query<Profile>(
      `
      SELECT id, name, username, email, phone, verified
      FROM users
      WHERE id = (SELECT uid FROM sessions WHERE sesskey = $1)
      `,
      [session]
    );
    if (profileResult.rowCount === 0) {
      res.status(404);
      return;
    }
    res.json(profileResult.rows[0]);
  } catch (e) {
    handleError(e, res);
  } finally {
    res.end();
  }
}

export async function updateProfile(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const username = req.body.username;
    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;

    client = await getPool().connect();

    const userResult = await client.query(
      `
      SELECT id, name, username, email, phone
      FROM users
      INNER JOIN sessions ON users.id = sessions.uid
      WHERE sessions.sesskey = $1
      `,
      [session]
    );
    if (userResult.rowCount === 0) {
      res.status(404);
      return;
    }
    const userInfo = userResult.rows[0];

    const myUid = userResult.rows[0].id;

    if (username && username.length && username !== userInfo.username) {
      validateMinMaxLength(username, 1, 64);
      const usernameResult = await client.query(
        `SELECT id FROM users WHERE lower(username) = lower($1)`,
        [username]
      );
      if (usernameResult.rowCount) {
        res.status(409);
        return;
      } else {
        await client.query(
          `UPDATE users SET username = $1 WHERE id = $2`,
          [username, myUid]
        );
      }
    }

    if (name && name.length && name !== userInfo.name) {
      await client.query(
        `UPDATE users SET name = $1 WHERE id = $2`,
        [name, myUid]
      );
    }

    if (email && email.length && email !== userInfo.email) {
      await client.query(
        `UPDATE users SET email = $1 WHERE id = $2`,
        [email, myUid]
      );
    }

    if (phone && phone.length && phone !== userInfo.phone) {
      await client.query(
        `UPDATE users SET phone = $1 WHERE id = $2`,
        [phone, myUid]
      );
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function getUserInfo(req: Request, res: Response) {
  try {
    const session = req.cookies.session;
    const uid = req.params.uid;

    if (session) {
      validateUuid(session);

      const userResult = await getPool().query<User>(
        `
        SELECT users.id, users.name, users.username, contacts.uid_contact,
          contacts.kind
        FROM users
        LEFT JOIN contacts ON users.id = contacts.uid_contact
          AND contacts.uid_owner = (SELECT uid FROM sessions WHERE sesskey = $2)
        WHERE users.id = $1
        `,
        [uid, session]
      );
      if (userResult.rowCount === 0) {
        res.status(404);
      } else {
        const result = userResult.rows[0];
        if (result.uid_contact !== null) {
          result.has_contact = true;
        } else {
          result.has_contact = false;
        }
        delete result.uid_contact;
        res.json(result);
      }
    } else {
      const userResult = await getPool().query<MinUser>(
        `SELECT id, name, username FROM users WHERE id = $1`,
        [uid]
      );
      if (userResult.rowCount === 0) {
        res.status(404);
      } else {
        res.json(userResult.rows[0]);
      }
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    res.end();
  }
}

export async function authorize(req: Request, res: Response) {
    let client;

    try {
      const username = validateMinMaxLength(req.body.u, 1, 64);
      const password = validateMinMaxLength(req.body.p, 1, 255);
      const clientName = validateMinMaxLength(req.body.client || 'default', 1, 64);

      client = await getPool().connect();

      const userResult = await client.query<AuthInfo>(
        `SELECT id, pwhash FROM users WHERE lower(username) = lower($1)`,
        [username]
      );
      if (userResult.rowCount === 0) {
        res.status(404).send('Unknown username');
        return;
      }

      if (!await bcrypt.compare(password, userResult.rows[0].pwhash)) {
        res.status(403).send('Invalid password');
        return;
      }

      const uid = userResult.rows[0].id;

      const sessionResult = await client.query<{ sesskey: string; }>(
        `
        INSERT INTO sessions
        (uid, client, sesskey)
        VALUES ($1, $2, gen_random_uuid())
        RETURNING (sesskey)
        `,
        [uid, clientName]
      );

      // Expires in 30 days (1000ms/s * 3600s/hr * 24hr/day * 30days)
      const expires = new Date(Date.now() + 1000 * 3600 * 24 * 30);
      res.cookie('session', sessionResult.rows[0].sesskey, { expires });
      res.write(uid);
    } catch (e) {
      handleError(e, res);
    } finally {
      client && client.release();
      res.end();
    }
}

export async function logout(req: Request, res: Response) {
  try {
    const session = validateUuid(req.cookies.session, 401);

    const q = await getPool().query('DELETE FROM sessions WHERE sesskey = $1', [session]);
    if (q.rowCount !== 1) {
      res.status(404);
    }
    res.clearCookie('session');
  } catch (e) {
    handleError(e, res);
  } finally {
    res.end();
  }
}

export async function register(req: Request, res: Response) {
  let client;

  try {
    const username = validateMinMaxLength(req.body.username, 1, 64);
    const password = validateMinMaxLength(req.body.password, 1, 255);
    const name = validateMinMaxLength(req.body.name, 1, 255);
    const email: string | null = req.body.email || null;
    if (email) {
      validateMinMaxLength(email, 1, 255);
    }
    const adminKey: string | undefined = req.query.adminKey as string | undefined;

    // Require a key for user registration for now.
    if (typeof adminKey !== 'string' || adminKey !== process.env.ADMIN_KEY) {
      throw new StatusError(401, 'Missing admin key');
    }

    const pwhash = await bcrypt.hash(password, 10);

    client = await getPool().connect();

    const q = await client.query(
      `
      INSERT INTO users
      (username, name, email, pwhash)
      VALUES ($1, $2, $3, $4)
      `,
      [username, name, email, pwhash]
    );
    if (q.rowCount !== 1) {
      res.status(400).send('User creation failed');
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { getPool } from '../util/db.js';
import { handleError, StatusError } from '../util/error.js';
import {
  validateUuid, validateMinMaxLength,
} from '../util/validation.js';
import { AuthInfo } from 'oi-types/user';

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
    res.cookie('session', session, {
      expires,
      sameSite: 'none',
      secure: true,
      //signed: true,
    });
    res.send(`${helloResult.rows[0].id}\nHello, ${helloResult.rows[0].name}`);
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
    res.cookie('session', sessionResult.rows[0].sesskey, {
      expires,
      sameSite: 'none',
      secure: true,
      //signed: true,
    });
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
    const wantsSession = (req.body.wantsSession ?? 'false') === 'true';
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

    const userResult = await client.query(
      `
      INSERT INTO users
      (username, name, email, pwhash)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [username, name, email, pwhash]
    );
    if (!userResult.rowCount) {
      throw new StatusError(400, 'User creation failed');
    }

    if (wantsSession) {
      const sessionResult = await client.query(
        `
        INSERT INTO sessions
        (uid, client, sesskey)
        VALUES ($1, $2, gen_random_uuid())
        RETURNING sesskey
        `,
        [userResult.rows[0].id, 'default']
      );
      if (!sessionResult.rowCount) {
        throw new StatusError(500, 'Session creation failed');
      }
      // Expires in 30 days (1000ms/s * 3600s/hr * 24hr/day * 30days)
      const expires = new Date(Date.now() + 1000 * 3600 * 24 * 30);
      res.cookie('session', sessionResult.rows[0].sesskey, {
        expires,
        sameSite: 'none',
        secure: true,
        //signed: true,
      });
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function registerWithProvider(req: Request, res: Response) {
  let client;

  try {
    const username = validateMinMaxLength(req.body.username, 1, 64);
    const provider = validateMinMaxLength(req.body.provider, 1, 255);
    const providerName = provider.split(':')[0];

    client = await getPool().connect();

    const providerInfoResult = await client.query(
      `DELETE FROM temp WHERE key = $1 RETURNING value`, [provider]
    );
    if (!providerInfoResult.rowCount) {
      throw new StatusError(404, 'Linked account not found');
    }

    let providerInfo = null;
    let email = null;
    switch (providerName) {
    case 'google':
      providerInfo = JSON.parse(providerInfoResult.rows[0].value);
      email = providerInfo.email;
      break;
    //case 'microsoft':
    //case 'apple':
    default:
      throw new StatusError(400, 'Unsupported provider: ' + providerName);
    }

    const userResult = await client.query(
      `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id`,
      [username, email]
    );
    if (userResult.rowCount === 0) {
      throw new StatusError(400, 'Create new user failed');
    }
    const uid = userResult.rows[0].id;

    switch (providerName) {
    case 'google':
      await client.query(
        `INSERT INTO google_accounts (uid, google_id, token) VALUES ($1, $2, $3)`,
        [uid, providerInfo.sub, providerInfo]
      );
      break;
    //case 'microsoft':
    //case 'apple':
    }

    const sessionResult = await client.query(
      `
      INSERT INTO sessions
      (uid, client, sesskey)
      VALUES ($1, $2, gen_random_uuid())
      RETURNING sesskey
      `,
      [uid, 'default']
    );
    if (!sessionResult.rowCount) {
      throw new StatusError(500, 'Session creation failed');
    }
    // Expires in 30 days (1000ms/s * 3600s/hr * 24hr/day * 30days)
    const expires = new Date(Date.now() + 1000 * 3600 * 24 * 30);
    res.cookie('session', sessionResult.rows[0].sesskey, {
      expires,
      sameSite: 'none',
      secure: true,
      //signed: true,
    });
    res.write(uid);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

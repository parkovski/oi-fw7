import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { UploadedFile } from 'express-fileupload';
import { getPool, getUserId } from '../util/db.js';
import { handleError, StatusError } from '../util/error.js';
import {
  validateUuid, validateMinMaxLength, validateBoolean, validateIfDefined,
} from '../util/validation.js';
import { User, Profile, MinUser, AuthInfo } from 'oi-types/user';
import sharp from 'sharp';

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

export async function getMyProfile(req: Request, res: Response) {
  try {
    const session = validateUuid(req.cookies.session, 401);

    const profileResult = await getPool().query<Profile>(
      `
      SELECT id, name, username, avatar_url AS "avatarUrl", email, phone,
        verified, public
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
    const username = validateIfDefined<string>(
      req.body.username, x => validateMinMaxLength(x, 1, 64)
    );
    const name = validateIfDefined<string>(req.body.name, x => validateMinMaxLength(x, 1, 255));
    const email = validateIfDefined<string>(req.body.email, x => validateMinMaxLength(x, 1, 255));
    const phone = validateIfDefined<string>(req.body.phone, x => validateMinMaxLength(x, 5, 20));
    const isPublic = validateBoolean(req.body.public);

    client = await getPool().connect();

    const userResult = await client.query(
      `
      SELECT id, name, username, email, phone, public
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

    const promises: Promise<any>[] = [];

    if (username && username.length && username !== userInfo.username) {
      if (username.toLowerCase() === userInfo.username.toLowerCase()) {
        // We're just changing the case here.
        promises.push(client.query(
          `UPDATE users SET username = $1 WHERE id = $2`,
          [username, myUid]
        ));
      } else {
        const usernameResult = await client.query(
          `SELECT id FROM users WHERE lower(username) = lower($1)`,
          [username]
        );
        if (usernameResult.rowCount) {
          res.status(409);
          return;
        } else {
          promises.push(client.query(
            `UPDATE users SET username = $1 WHERE id = $2`,
            [username, myUid]
          ));
        }
      }
    }

    if (name && name.length && name !== userInfo.name) {
      promises.push(client.query(
        `UPDATE users SET name = $1 WHERE id = $2`,
        [name, myUid]
      ));
    }

    if (email && email.length && email !== userInfo.email) {
      promises.push(client.query(
        `UPDATE users SET email = $1 WHERE id = $2`,
        [email, myUid]
      ));
    }

    if (phone && phone.length && phone !== userInfo.phone) {
      promises.push(client.query(
        `UPDATE users SET phone = $1 WHERE id = $2`,
        [phone, myUid]
      ));
    }

    if (isPublic !== userInfo.public) {
      promises.push(client.query(
        `UPDATE users SET public = $1 WHERE id = $2`,
        [isPublic, myUid]
      ));
    }

    await Promise.all(promises);
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
        SELECT users.id, users.name, users.username, users.avatar_url AS "avatarUrl",
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
        res.json(userResult.rows[0]);
      }
    } else {
      const userResult = await getPool().query<MinUser>(
        `SELECT id, name, username, avatar_url AS "avatarUrl" FROM users WHERE id = $1`,
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

const allowedExtensions = new Set(['.png', '.jpg', '.jpeg']);
export async function uploadProfilePhoto(req: Request, res: Response) {
  let session: string;
  try {
    session = validateUuid(req.cookies.session, 401);
  } catch (e) {
    handleError(e, res);
    res.end();
    return;
  }

  if (!req.files || !req.files.photo || !(req.files.photo as UploadedFile).name) {
    res.status(400).end('No file specified');
    return;
  }
  const file = req.files.photo as UploadedFile;
  crypto.randomBytes(32, async (err, buf) => {
    if (err) {
      res.status(500).end('Generate random bytes failed');
      return;
    }
    const ext = path.extname(file.name);
    if (!allowedExtensions.has(ext)) {
      res.status(400).end(`File type '${ext}' not allowed`);
      return;
    }
    const namePart = buf.toString('base64').replaceAll(/\//g, '_').replaceAll(/\+/g, '-');
    const tmpPath = `${process.env.TEMP_DIR || process.env.UPLOAD_DIR}/${namePart}.tmp${ext}`
    const filename = `${namePart}${ext}`;
    const uploadPath = `${process.env.UPLOAD_DIR}/${filename}`;
    let client;
    try {
      client = await getPool().connect();
      const user = await client.query<{ id: string; avatar_url: string | null}>(
        `
        SELECT id, avatar_url
        FROM users
        INNER JOIN sessions ON users.id = sessions.uid
        WHERE sesskey = $1
        `,
        [session]
      );
      if (user.rowCount === 0) {
        res.status(404);
        return;
      }
      const myUid = user.rows[0].id;
      const avatar = user.rows[0].avatar_url;
      const promises = [
        file.mv(tmpPath),
        client.query(
          `UPDATE users SET avatar_url = $1 WHERE id = $2`,
          [filename, myUid]
        ),
      ];
      if (avatar) {
        promises.push(fs.unlink(`${process.env.UPLOAD_DIR}/${avatar}`));
      }
      await Promise.all(promises);
      await sharp(tmpPath)
        .resize(128, 128)
        .toFile(uploadPath);
      res.end(filename);
      await fs.unlink(tmpPath);
    } catch (e) {
      handleError(e, res);
    } finally {
      client && client.release();
      res.end();
    }
  });
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

export async function changePassword(req: Request, res: Response) {
  let client;
  try {
    const session = validateUuid(req.cookies.session, 401);
    const currentPassword = validateMinMaxLength(req.body.currentPassword, 1, 255);
    const newPassword = validateMinMaxLength(req.body.newPassword, 6, 255);
    const confirmPassword = req.body.confirmPassword;

    if (confirmPassword !== newPassword) {
      throw new StatusError(400, 'Passwords not equal');
    }

    client = await getPool().connect();

    const myUid = await getUserId(client, session);
    let q = await client.query(
      `SELECT pwhash FROM users WHERE id = $1`,
      [myUid]
    );
    if (!await bcrypt.compare(currentPassword, q.rows[0].pwhash)) {
      throw new StatusError(403, 'Current password did not match');
    }

    const pwhash = await bcrypt.hash(newPassword, 10);
    q = await client.query(
      `UPDATE users SET pwhash = $1 WHERE id = $2`,
      [pwhash, myUid]
    );
    if (q.rowCount === 0) {
      throw new StatusError(404);
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

import type { Request, Response } from 'express';
import { getPool, getUserId } from '../util/db.js';
import { handleError, StatusError } from '../util/error.js';
import {
  validateUuid, validateMinLength, validateMinMaxLength,
} from '../util/validation.js';
import { OAuth2Client } from 'google-auth-library';

export async function setGoogleCredential(req: Request, res: Response) {
  let client;
  try {
    const session = validateUuid(req.cookies.session, 401);
    // This thing is very long but we don't know yet if it's valid so just make
    // sure something is there for now.
    const googleCred = validateMinLength(req.body.credential, 32);

    client = await getPool().connect();

    // Make sure the session is valid.
    const uid = await getUserId(client, session);

    const oauth2Client = new OAuth2Client;
    const ticket = await oauth2Client.verifyIdToken({
      idToken: googleCred,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      throw new StatusError(400, 'No Google ticket payload');
    }
    const googleUserId = payload.sub;
    await client.query(
      `INSERT INTO google_accounts (uid, google_id, token) VALUES ($1, $2, $3)`,
      [uid, googleUserId, payload]
    );
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function authorizeWithGoogle(req: Request, res: Response) {
  let client;
  try {
    const googleCred = validateMinLength(req.body.credential, 32);
    const clientName = validateMinMaxLength(req.body.client || 'default', 1, 64);

    client = await getPool().connect();

    const oauth2Client = new OAuth2Client;
    const ticket = await oauth2Client.verifyIdToken({
      idToken: googleCred,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      throw new StatusError(401, 'No Google ticket payload');
    }
    const googleUserId = payload.sub;
    const uidResult = await client.query(
      `SELECT uid FROM google_accounts WHERE google_id = $1`,
      [googleUserId]
    );
    if (!uidResult.rowCount) {
      await client.query(
        `INSERT INTO temp (key, value) VALUES ($1, $2)`,
        [`google:${googleUserId}`, JSON.stringify(payload)]
      );
      res.status(201).write(`google:${googleUserId}`);
      return;
    }
    const uid = uidResult.rows[0].uid;

    const sessionResult = await client.query<{ sesskey: string }>(
      `
      INSERT INTO sessions
      (uid, client, sesskey)
      VALUES ($1, $2, gen_random_uuid())
      RETURNING sesskey
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

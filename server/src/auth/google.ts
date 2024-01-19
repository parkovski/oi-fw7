import type { Request, Response } from 'express';
import { getPool } from '../util/db.js';
import { handleError, StatusError } from '../util/error.js';
import {
  validateMinLength, validateMinMaxLength,
} from '../util/validation.js';
import { OAuth2Client } from 'google-auth-library';
import AuthModel from '../models/auth.js';
import SessionModel from '../models/session.js';
import TempModel from '../models/temp.js';

export async function setGoogleCredential(req: Request, res: Response) {
  let client;
  try {
    // This thing is very long but we don't know yet if it's valid so just make
    // sure something is there for now.
    const googleCred = validateMinLength(req.body.credential, 32);

    client = await getPool().connect();

    // Make sure the session is valid.
    const session = new SessionModel(client, req.cookies.session);
    const uid = await session.getUserId();

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

    await new AuthModel(client).linkGoogleAccount(uid, googleUserId, payload);
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

    const auth = new AuthModel(client);
    const uid = await auth.getIdForGoogleId(googleUserId);
    if (!uid) {
      const key = `google:${googleUserId}`;
      await new TempModel(client).set(key, JSON.stringify(payload));
      res.status(201).write(key);
      return;
    }

    (await SessionModel.newSession(client, uid, clientName)).setSessionCookie(res);
    res.write(uid);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

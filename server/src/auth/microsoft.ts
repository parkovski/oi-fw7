import * as jose from 'jose';
import { Request, Response } from 'express';
import { getPool } from '../util/db.js';
import { handleError } from '../util/error.js';
import {
  validateMinLength, validateMinMaxLength,
} from '../util/validation.js';
import AuthModel from '../models/auth.js';
import SessionModel from '../models/session.js';
import TempModel from '../models/temp.js';

if (!process.env.MSFT_CLIENT_ID) {
  console.warn('Microsoft authentication needs MSFT_CLIENT_ID set.');
}

export async function setMicrosoftCredential(req: Request, res: Response) {
  let client;
  try {
    const msCred = validateMinLength(req.body.credential, 32);

    client = await getPool().connect();

    const session = new SessionModel(client, req.cookies.session);
    const uid = await session.getUserId();

    const jwks = jose.createRemoteJWKSet(new URL('https://login.microsoftonline.com/consumers/discovery/v2.0/keys'));
    const payload = await jose.jwtVerify(msCred, jwks, {
      issuer: 'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0',
      audience: process.env.MSFT_CLIENT_ID,
    });
    const microsoftUserId = payload.payload.sub!;

    await new AuthModel(client).linkMicrosoftAccount(uid, microsoftUserId, payload);
  } catch (e) {
    console.error(e);
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function authorizeWithMicrosoft(req: Request, res: Response) {
  let client;
  try {
    const msCred = validateMinLength(req.body.credential, 32);
    const clientName = validateMinMaxLength(req.body.client || 'default', 1, 64);

    client = await getPool().connect();

    const jwks = jose.createRemoteJWKSet(new URL('https://login.microsoftonline.com/consumers/discovery/v2.0/keys'));
    const payload = await jose.jwtVerify(msCred, jwks, {
      issuer: 'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0',
      audience: process.env.MSFT_CLIENT_ID,
    });
    const microsoftUserId = payload.payload.sub!;

    const auth = new AuthModel(client);
    const uid = await auth.getIdForMicrosoftId(microsoftUserId);
    if (!uid) {
      const key = `microsoft:${microsoftUserId}`;
      await new TempModel(client).set(key, JSON.stringify(payload));
      res.status(201).write(key);
      return;
    }

    (await SessionModel.newSession(client, uid, clientName)).setSessionCookie(res);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

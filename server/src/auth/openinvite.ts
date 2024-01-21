import type { Request, Response } from 'express';
import { getPool } from '../util/db.js';
import { handleError, StatusError } from '../util/error.js';
import {
  validateMinMaxLength,
} from '../util/validation.js';
import SessionModel from '../models/session.js';
import AuthModel from '../models/auth.js';
import TempModel from '../models/temp.js';

export async function hello(req: Request, res: Response) {
  let client;
  try {
    client = await getPool().connect();

    const session = new SessionModel(client, req.cookies.session);
    const helloResult = await session.hello();
    session.setSessionCookie(res);
    res.write(`${helloResult.id}\nHello, @${helloResult.username}`);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
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

    const auth = new AuthModel(client);
    const uid = await auth.getIdAndCheckPassword(username, password);
    const session = await SessionModel.newSession(client, uid, clientName);
    session.setSessionCookie(res);
    res.write(uid);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function logout(req: Request, res: Response) {
  let client;
  try {
    client = await getPool().connect();

    const session = new SessionModel(client, req.cookies.session)
    await session.revokeSession(res);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function register(req: Request, res: Response) {
  let client;

  try {
    const username = validateMinMaxLength(req.body.username, 1, 64);
    if (!/^[a-zA-Z0-9_-]$/.test(username)) {
      throw new StatusError(400, 'Invalid username');
    }
    const password = validateMinMaxLength(req.body.password, 6, 255);
    const name = validateMinMaxLength(req.body.name, 1, 255);
    const wantsSession = (req.body.wantsSession ?? 'false') === 'true';
    const email: string | null = req.body.email || null;
    if (email) {
      validateMinMaxLength(email, 1, 255);
    }

    client = await getPool().connect();

    const uid = await new AuthModel(client).createUser(username, password, name, email);

    if (wantsSession) {
      const session = await SessionModel.newSession(client, uid);
      session.setSessionCookie(res);
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

    const providerInfoString = await new TempModel(client).delete(provider);
    if (!providerInfoString) {
      throw new StatusError(404, 'Linked account not found');
    }

    let providerInfo = null;
    let email = null;
    let name = null;
    switch (providerName) {
    case 'google':
      providerInfo = JSON.parse(providerInfoString);
      email = providerInfo.email;
      break;
    case 'microsoft':
      providerInfo = JSON.parse(providerInfoString);
      email = providerInfo.preferred_username;
      name = providerInfo.name;
      break;
    //case 'apple':
      //break;
    default:
      throw new StatusError(400, 'Unsupported provider: ' + providerName);
    }

    const auth = new AuthModel(client);
    const uid = await auth.createUser(username, null, name, email);

    switch (providerName) {
    case 'google':
      await auth.linkGoogleAccount(uid, providerInfo.sub, providerInfo);
      break;
    case 'microsoft':
      await auth.linkMicrosoftAccount(uid, providerInfo.sub, providerInfo);
      break;
    //case 'apple':
      //break;
    }

    (await SessionModel.newSession(client, uid)).setSessionCookie(res);
    res.write(uid);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

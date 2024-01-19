import type { Request, Response } from 'express';
import { getPool } from '../util/db.js';
import { handleError } from '../util/error.js';
import {
  validateUuid, validateOneOf, validateBoolean
} from '../util/validation.js';
import SettingsModel from '../models/settings.js';

export async function getNotificationSettings(req: Request, res: Response) {
  let client;
  try {
    const session = validateUuid(req.cookies.session, 401);
    client = await getPool().connect();
    const settings = await new SettingsModel(client).getNotificationSettings(session);
    res.json(settings);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

const allowedSettings = [
  'event_added',
  'event_responded',
  'event_commented',
  'event_attendance_changed',
  'chat',
  'groupchat',
  'contact_requested',
  'contact_added',
  'contact_request_approved',
];
export async function setNotificationSetting(req: Request, res: Response) {
  let client;
  try {
    const session = validateUuid(req.cookies.session, 401);
    const settingName = validateOneOf(req.body.setting, allowedSettings);
    const settingValue = validateBoolean(req.body.value);

    client = await getPool().connect();

    await new SettingsModel(client).setNotificationSetting(session, settingName, settingValue);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function setAllNotificationSettings(req: Request, res: Response) {
  let client;
  try {
    const session = validateUuid(req.cookies.session, 401);
    const value = validateBoolean(req.body.value);
    client = await getPool().connect();
    await new SettingsModel(client).setAllNotificationSettings(session, value);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

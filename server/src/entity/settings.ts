import type { Request, Response } from 'express';
import { getPool } from '../util/db.js';
import { handleError } from '../util/error.js';
import {
  validateUuid, validateOneOf, validateBoolean
} from '../util/validation.js';
import { NotificationSettings } from 'oi-types/settings';

export async function getNotificationSettings(req: Request, res: Response) {
  try {
    const session = validateUuid(req.cookies.session, 401);
    const settings = await getPool().query<NotificationSettings>(
      `
      SELECT
        COALESCE(notification_settings.event_added, TRUE) event_added,
        COALESCE(notification_settings.event_responded, TRUE) event_responded,
        COALESCE(notification_settings.event_commented, TRUE) event_commented,
        COALESCE(notification_settings.event_attendance_changed, TRUE) event_attendance_changed,
        COALESCE(notification_settings.chat, TRUE) chat,
        COALESCE(notification_settings.groupchat, TRUE) groupchat,
        COALESCE(notification_settings.contact_requested, TRUE) contact_requested,
        COALESCE(notification_settings.contact_added, TRUE) contact_added,
        COALESCE(notification_settings.contact_request_approved, TRUE) contact_request_approved
      FROM notification_settings
      RIGHT JOIN users ON users.id = notification_settings.uid
      WHERE users.id = (SELECT uid FROM sessions WHERE sesskey = $1)
      `,
      [session]
    );
    console.log(settings.rows[0]);
    res.json(settings.rows[0]);
  } catch (e) {
    handleError(e, res);
  } finally {
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
  try {
    const session = validateUuid(req.cookies.session, 401);
    const settingName = validateOneOf(req.body.setting, allowedSettings);
    const settingValue = validateBoolean(req.body.value);
    await getPool().query(
      `
      INSERT INTO notification_settings (${settingName}, uid)
      VALUES ($1, (SELECT uid FROM sessions WHERE sesskey = $2))
      ON CONFLICT (uid) DO UPDATE SET ${settingName} = $1
      `,
      [settingValue, session]
    );
  } catch (e) {
    handleError(e, res);
  } finally {
    res.end();
  }
}

export async function setAllNotificationSettings(req: Request, res: Response) {
  try {
    const session = validateUuid(req.cookies.session, 401);
    const value = validateBoolean(req.body.value);
    await getPool().query(
      `
      INSERT INTO notification_settings (
        uid,
        event_added,
        event_responded,
        event_commented,
        event_attendance_changed,
        chat,
        groupchat,
        contact_requested,
        contact_added,
        contact_request_approved
      )
      VALUES (
        (SELECT uid FROM sessions WHERE sesskey = $1),
        $2, $2, $2, $2, $2, $2, $2, $2, $2
      )
      ON CONFLICT (notification_settings.uid) DO UPDATE SET
        event_added = $2,
        event_responded = $2,
        event_commented = $2,
        event_attendance_changed = $2,
        chat = $2,
        groupchat = $2,
        contact_requested = $2,
        contact_added = $2,
        contact_request_approved = $2
      `,
      [session, value]
    );
  } catch (e) {
    handleError(e, res);
  } finally {
    res.end();
  }
}

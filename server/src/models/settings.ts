import DataModel from './data.js';
import { StatusError } from '../util/error.js';
import { NotificationSettings } from 'oi-types/settings';

export default class SettingsModel extends DataModel {
  async getNotificationSettings(session: string): Promise<NotificationSettings> {
    const result = await this._dbclient.query(
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
    if (!result.rowCount) {
      throw new StatusError(404, 'User not found')
    }
    return result.rows[0];
  }

  async getNotificationSetting(uid: string, setting: keyof NotificationSettings):
      Promise<boolean> {
    const result = await this._dbclient.query<{ setting: boolean }>(
      `SELECT "${setting}" AS setting FROM notification_settings WHERE uid = $1`,
      [uid]
    );
    if (result.rowCount === 0) {
      // Notifications default to on.
      return true;
    }
    return result.rows[0].setting;
  }

  async getNotificationSettingForMany(uids: string[], setting: keyof NotificationSettings):
      Promise<boolean[]> {
    const result = await this._dbclient.query<{ setting: boolean }>(
      `
      SELECT COALESCE(notification_settings."${setting}", TRUE) AS setting
      FROM users
      LEFT JOIN notification_settings ON users.id = notification_settings.uid
      WHERE users.id = ANY($1::bigint array)
      `,
      [uids]
    );
    return result.rows.map(row => row.setting);
  }

  async setNotificationSetting(session: string, settingName: string, value: boolean) {
    await this._dbclient.query(
      `
      INSERT INTO notification_settings (${settingName}, uid)
      VALUES ($1, (SELECT uid FROM sessions WHERE sesskey = $2))
      ON CONFLICT (uid) DO UPDATE SET ${settingName} = $1
      `,
      [value, session]
    );
  }

  async setAllNotificationSettings(session: string, value: boolean) {
    await this._dbclient.query(
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
      ON CONFLICT (uid) DO UPDATE SET
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
  }
}

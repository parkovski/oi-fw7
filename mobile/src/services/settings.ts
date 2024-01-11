import Entity from './entity';
import { NotificationSettings } from 'oi-types/settings';
import { fetchAny, fetchJson } from '../js/fetch';

class SettingsService {
  _notificationSettings: Entity<NotificationSettings>;

  constructor() {
    this._notificationSettings = new Entity(() => fetchJson('/settings/notifications'));
  }

  getNotificationSettings(): Entity<NotificationSettings> {
    return this._notificationSettings;
  }

  async setNotificationSetting(setting: keyof NotificationSettings, value: boolean) {
    await fetchAny(`/settings/notifications`, {
      method: 'PUT',
      body: new URLSearchParams({
        setting,
        value: value.toString(),
      }),
    });
    if (this._notificationSettings.data) {
      this._notificationSettings.data[setting] = value;
      this._notificationSettings.publish();
    } else {
      this._notificationSettings.refresh();
    }
  }

  async setAllNotificationSettings(value: boolean) {
    await fetchAny(`/settings/notifications/all`, {
      method: 'PUT',
      body: new URLSearchParams({ value: value.toString() }),
    });
    if (this._notificationSettings.data) {
      Object.keys(this._notificationSettings.data).forEach(key => {
        (this._notificationSettings.data as any)[key] = value;
      });
      this._notificationSettings.publish();
    } else {
      this._notificationSettings.refresh();
    }
  }
}

const service = new SettingsService;
export default service;

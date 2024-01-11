import pg from 'pg';
import { StatusError } from './error.js';
import type { NotificationSettings } from 'oi-types/settings';

let pool: pg.Pool | undefined;

export function initPool(config: pg.PoolConfig): pg.Pool {
  pool = new pg.Pool(config);
  return pool;
}

export function getPool(): pg.Pool {
  return pool!;
}

export async function getUserId(client: pg.PoolClient, session: string): Promise<string> {
  let q = await client.query(
    `SELECT uid FROM sessions WHERE sessions.sesskey = $1`,
    [session]
  );
  if (q.rowCount === 0) {
    throw new StatusError(401, 'User id for session not found');
  }
  return q.rows[0].uid;
}

export async function getNotificationSetting(
  client: pg.PoolClient, uid: string, setting: keyof NotificationSettings
): Promise<boolean> {
  const q = await client.query<{ setting: boolean }>(
    `SELECT "${setting}" AS setting FROM notification_settings WHERE uid = $1`,
    [uid]
  );
  if (q.rowCount === 0) {
    // Notifications default to on.
    return true;
  }
  return q.rows[0].setting;
}

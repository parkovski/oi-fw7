import { validateUuid } from '../util/validation.js';
import type { PoolClient } from 'pg';
import type { Response } from 'express';
import { StatusError } from '../util/error.js';
import DataModel from './data.js';

export interface HelloResult {
  id: string;
  username: string;
}

export default class SessionModel extends DataModel {
  private _session: string;

  constructor(dbclient: PoolClient, session: string) {
    super(dbclient);
    validateUuid(session, 401);
    this._session = session;
  }

  static async newSession(
    dbclient: PoolClient, uid: string, clientName?: string
  ): Promise<SessionModel> {
    clientName ??= 'default';
    const result = await dbclient.query<{ sesskey: string }>(
      `
      INSERT INTO sessions (uid, client, sesskey)
      VALUES ($1, $2, gen_random_uuid())
      RETURNING sesskey
      `,
      [uid, clientName]
    );
    if (!result.rowCount) {
      throw new StatusError(400, 'Create session failed');
    }
    return new SessionModel(dbclient, result.rows[0].sesskey);
  }

  get session(): string {
    return this._session;
  }

  async getUserId(): Promise<string> {
    const result = await this._dbclient.query(
      `SELECT uid FROM sessions WHERE sesskey = $1`,
      [this._session]
    );
    if (!result.rowCount) {
      throw new StatusError(404, 'Session not found');
    }
    return result.rows[0].uid;
  }

  async hello(): Promise<HelloResult> {
    const result = await this._dbclient.query<HelloResult>(
      `
      UPDATE sessions
      SET last_used = NOW()
      FROM users
      WHERE sesskey = $1 AND users.id = sessions.uid
      RETURNING users.username, users.id
      `,
      [this._session]
    );
    if (!result.rowCount) {
      throw new StatusError(404, 'Session not found');
    }
    return result.rows[0];
  }

  setSessionCookie(res: Response) {
    const expires = new Date(Date.now() + 1000 * 3600 * 24 * 30);
    res.cookie('session', this._session, {
      expires,
      sameSite: 'none',
      secure: true,
      //signed: true,
    });
  }

  async revokeSession(res: Response) {
    await this._dbclient.query(`DELETE FROM sessions WHERE sesskey = $1`, [this._session]);
    res.clearCookie('session');
  }

  async setPushEndpoint(endpoint: string, p256dh: string, auth: string): Promise<boolean> {
    const result = await this._dbclient.query(
      `
      UPDATE sessions
      SET push_endpoint = $1, key_p256dh = $2, key_auth = $3
      WHERE sesskey = $4
      `,
      [endpoint, p256dh, auth, this._session]
    );
    return result.rowCount !== 0;
  }
}

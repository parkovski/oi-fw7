import bcrypt from 'bcrypt';
import type { PoolClient } from 'pg';
import { StatusError } from '../util/error.js';
import DataModel from './data.js';

export default class AuthModel extends DataModel {
  constructor(dbclient: PoolClient) {
    super(dbclient);
  }

  async getIdForGoogleId(googleId: string): Promise<string | null> {
    const result = await this._dbclient.query<{ uid: string }>(
      `SELECT uid FROM google_accounts WHERE google_id = $1`,
      [googleId]
    );
    if (!result.rowCount) {
      return null;
    }
    return result.rows[0].uid;
  }

  async getIdForMicrosoftId(microsoftId: string): Promise<string | null> {
    const result = await this._dbclient.query<{ uid: string }>(
      `SELECT uid FROM microsoft_accounts WHERE microsoft_id = $1`,
      [microsoftId]
    );
    if (!result.rowCount) {
      return null;
    }
    return result.rows[0].uid;
  }

  async getIdAndCheckPassword(username: string, password: string): Promise<string> {
    const userResult = await this._dbclient.query<{ id: string, pwhash: string | null }>(
      `SELECT id, pwhash FROM users WHERE lower(username) = lower($1)`,
      [username]
    );
    if (!userResult.rowCount) {
      throw new StatusError(404, 'User not found');
    }

    const pwhash = userResult.rows[0].pwhash;
    if (pwhash === null) {
      throw new StatusError(401, 'Login with password not supported');
    }
    if (!await bcrypt.compare(password, pwhash)) {
      throw new StatusError(403, 'Invalid password');
    }

    return userResult.rows[0].id;
  }

  async createUser(
    username: string, password: string | null, name: string | null, email: string | null
  ): Promise<string> {
    const pwhash = password ? await bcrypt.hash(password, 10) : null;
    const result = await this._dbclient.query<{ id: string }>(
      `
      INSERT INTO users
      (username, name, email, pwhash)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [username, name, email, pwhash]
    );
    if (!result.rowCount) {
      throw new StatusError(400, 'User creation failed');
    }
    return result.rows[0].id;
  }

  async linkGoogleAccount(uid: string, googleId: string, googleToken: object) {
    await this._dbclient.query(
      `INSERT INTO google_accounts (uid, google_id, token) VALUES ($1, $2, $3)`,
      [uid, googleId, googleToken]
    );
  }

  async linkMicrosoftAccount(uid: string, microsoftId: string, microsoftToken: object) {
    await this._dbclient.query(
      `INSERT INTO microsoft_accounts (uid, microsoft_id, token) VALUES ($1, $2, $3)`,
      [uid, microsoftId, microsoftToken]
    );
  }
}

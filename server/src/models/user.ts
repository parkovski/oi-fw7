import DataModel from './data.js';
import { StatusError } from '../util/error.js';
import { Profile, User, MinUser } from 'oi-types/user';
import bcrypt from 'bcrypt';

export default class UserModel extends DataModel {
  async getProfileForSession(session: string): Promise<Profile> {
    const result = await this._dbclient.query<Profile>(
      `
      SELECT id, name, username, avatar_url AS "avatarUrl", email, phone,
        verified, public
      FROM users
      WHERE id = (SELECT uid FROM sessions WHERE sesskey = $1)
      `,
      [session]
    );
    if (!result.rowCount) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0];
  }

  async getContactForSession(session: string, contactUid: string): Promise<User> {
    const result = await this._dbclient.query<User>(
      `
      SELECT users.id, users.name, users.username, users.avatar_url AS "avatarUrl",
        contacts.kind
      FROM users
      LEFT JOIN contacts ON users.id = contacts.uid_contact
        AND contacts.uid_owner = (SELECT uid FROM sessions WHERE sesskey = $2)
      WHERE users.id = $1
      `,
      [contactUid, session]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0];
  }

  async getMinUser(uid: string): Promise<MinUser> {
    const result = await this._dbclient.query<MinUser>(
      `SELECT id, name, username, avatar_url AS "avatarUrl" FROM users WHERE id = $1`,
      [uid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0];
  }

  async changePassword(uid: string, oldPassword: string, newPassword: string) {
    const pwhashResult = await this._dbclient.query<{ pwhash: string | null }>(
      `SELECT pwhash FROM users WHERE id = $1`,
      [uid]
    );
    if (!pwhashResult.rowCount) {
      throw new StatusError(404, 'User not found');
    }

    if (pwhashResult.rows[0].pwhash !== null) {
      // If the hash is null there was no previous password.
      if (!await bcrypt.compare(oldPassword, pwhashResult.rows[0].pwhash)) {
        throw new StatusError(403, 'Current password did not match');
      }
    }

    const pwhash = await bcrypt.hash(newPassword, 10);
    const updateResult = await this._dbclient.query(
      `UPDATE users SET pwhash = $1 WHERE id = $2`,
      [pwhash, uid]
    );
    if (updateResult.rowCount === 0) {
      throw new StatusError(500, 'Failed to update password');
    }
  }
}

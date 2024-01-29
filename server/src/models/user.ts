import DataModel from './data.js';
import { StatusError } from '../util/error.js';
import { Profile, User, MinUser } from 'oi-types/user';
import { ContactKind } from 'oi-types/user';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

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

  async getContactsForUser(uid: string): Promise<User[]> {
    const result = await this._dbclient.query<User>(
      `
      SELECT users.id, users.name, users.username,
        users.avatar_url AS "avatarUrl", contacts.kind
      FROM contacts
      INNER JOIN users ON contacts.uid_contact = users.id
      WHERE contacts.uid_owner = $1
      `,
      [uid]
    );
    return result.rows;
  }

  async getFollowersForUser(uid: string): Promise<User[]> {
    const result = await this._dbclient.query<User>(
      `
      SELECT users.id, users.name, users.username,
        users.avatar_url AS "avatarUrl"
      FROM contacts
      INNER JOIN users ON contacts.uid_owner = users.id
      WHERE contacts.uid_contact = $1
      `,
      [uid]
    );
    return result.rows;
  }

  async getContactRequestsForSession(session: string): Promise<User[]> {
    const result = await this._dbclient.query(
      `
      SELECT users.id, users.name, users.username,
        users.avatar_url AS "avatarUrl"
      FROM contacts
      INNER JOIN users ON contacts.uid_owner = users.id
      WHERE contacts.uid_contact = (SELECT uid FROM sessions WHERE sesskey = $1)
        AND contacts.kind = 0
      `,
      [session]
    );
    return result.rows;
  }

  async sessionHasContact(session: string, uidContact: string): Promise<boolean> {
    const result = await this._dbclient.query(
      `
      SELECT kind FROM contacts
      WHERE (uid_owner, uid_contact) = ((SELECT uid FROM sessions WHERE sesskey = $1), $2)
      `,
      [session, uidContact]
    );
    if (result.rowCount === 0 || result.rows[0].kind === ContactKind.Requested) {
      return false;
    }
    return true;
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

  async updateUserField(uid: string, field: string, value: any) {
    await this._dbclient.query(
      `UPDATE users SET "${field}" = $1 WHERE id = $2`,
      [value, uid]
    );
  }

  async getIdForUsername(username: string): Promise<string | null> {
    const result = await this._dbclient.query<{ id: string }>(
      `SELECT id FROM users WHERE lower(username) = lower($1)`,
      [username]
    )
    if (!result.rowCount) {
      return null;
    }
    return result.rows[0].id;
  }

  async getIdAndAvatarForSession(session: string):
      Promise<{ id: string; avatar_url: string | null; } | null> {
    const result = await this._dbclient.query<{ id: string; avatar_url: string | null; }>(
      `
      SELECT id, avatar_url
      FROM users
      INNER JOIN sessions ON users.id = sessions.uid
      WHERE sesskey = $1
      `,
      [session]
    );
    if (!result.rowCount) {
      return null;
    }
    return result.rows[0];
  }

  async getNameAndPublic(uid: string): Promise<{ name: string; public: string }> {
    const result = await this._dbclient.query<{ name: string; public: string }>(
      `SELECT name, public FROM users WHERE id = $1`, [uid]
    );
    if (!result.rowCount) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0];
  }

  async getUsername(uid: string): Promise<string> {
    const result = await this._dbclient.query<{ username: string }>(
      `SELECT username FROM users WHERE id = $1`, [uid]
    );
    if (!result.rowCount) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0].username;
  }

  async getNameAndUsername(uid: string): Promise<{ name: string; username: string }> {
    const result = await this._dbclient.query<{ name: string; username: string }>(
      `SELECT name, username FROM users WHERE id = $1`, [uid]
    );
    if (!result.rowCount) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0];
  }

  async addContact(myUid: string, contactUid: string, kind: ContactKind) {
    const result = await this._dbclient.query(
      `
      INSERT INTO contacts (uid_owner, uid_contact, kind)
      VALUES ($1, $2, $3)
      `,
      [myUid, contactUid, kind]
    );
    if (!result.rowCount) {
      throw new StatusError(400, 'Contacts failed to update');
    }
  }

  async deleteContact(session: string, contactUid: string) {
    const result = await this._dbclient.query(
      `
      DELETE FROM contacts
      WHERE uid_owner = (SELECT uid FROM sessions WHERE sesskey = $1)
        AND uid_contact = $2
      `,
      [session, contactUid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'Contact not found');
    }
  }

  async approveContact(session: string, uidOwner: string):
      Promise<{ uid_contact: string; name: string}> {
    const result = await this._dbclient.query<{ uid_contact: string; name: string }>(
      `
      UPDATE contacts SET contacts.kind = 1
      FROM users
      WHERE (contacts.uid_owner, contacts.uid_contact) =
        ($1, (SELECT uid FROM sessions WHERE sesskey = $2))
        AND users.id = contacts.uid_contact
      RETURNING contacts.uid_contact, users.name
      `,
      [uidOwner, session]
    );
    if (!result.rowCount) {
      throw new StatusError(404, 'Contact not found');
    }
    return result.rows[0];
  }

  async denyContact(session: string, uidOwner: string):
      Promise<{ uid_contact: string; name: string }> {
    const result = await this._dbclient.query<{ uid_contact: string; name: string }>(
      `
      DELETE FROM contacts
      USING users
      WHERE (uid_owner, uid_contact) = ($1, (SELECT uid FROM sessions WHERE sesskey = $2))
        AND users.id = uid_contact
      RETURNING uid_contact, users.name
      `,
      [uidOwner, session]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'Contact not found');
    }
    return result.rows[0];
  }

  static async createAvatarFilename(): Promise<string> {
    const promise = new Promise<string>((resolve, reject) => {
      crypto.randomBytes(32, (err, buf) => {
        if (err) reject(err);
        const name = buf.toString('base64').replaceAll(/\//g, '_').replaceAll(/\+/g, '-');
        resolve(name);
      });
    });
    return promise;
  }
}

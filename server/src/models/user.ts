import DataModel from './data.js';
import type { PoolClient } from 'pg';
import { StatusError } from '../util/error.js';
import { Profile, User, MinUser } from 'oi-types/user';
import { ContactKind } from 'oi-types/user';
import { EventSummary } from 'oi-types/event';
import bcrypt from 'bcrypt';

export default class UserModel extends DataModel {
  private _uid: string;

  constructor(client: PoolClient, uid: string) {
    super(client);
    this._uid = uid;
  }

  async getEventSummary(): Promise<EventSummary[]> {
    const result = await this._dbclient.query<EventSummary>(
      `
      SELECT events.id, events.title, events.start_time AS "startTime",
        events.end_time AS "endTime", events.public, attendance.kind
      FROM attendance
      INNER JOIN events ON attendance.eid = events.id
      WHERE attendance.uid = $1 AND events.gid IS NULL
      `,
      [this._uid]
    );
    return result.rows;
  }

  async getProfile(): Promise<Profile> {
    const result = await this._dbclient.query<Profile>(
      `
      SELECT id, name, username, avatar_url AS "avatarUrl", email, phone,
        verified, public
      FROM users
      WHERE id = $1
      `,
      [this._uid]
    );
    if (!result.rowCount) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0];
  }

  async getContact(contactUid: string): Promise<User> {
    const result = await this._dbclient.query<User>(
      `
      SELECT users.id, users.name, users.username, users.avatar_url AS "avatarUrl",
        contacts.kind
      FROM users
      LEFT JOIN contacts ON users.id = contacts.uid_contact
        AND contacts.uid_owner = $2
      WHERE users.id = $1
      `,
      [contactUid, this._uid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0];
  }

  async getContacts(): Promise<User[]> {
    const result = await this._dbclient.query<User>(
      `
      SELECT users.id, users.name, users.username,
        users.avatar_url AS "avatarUrl", contacts.kind
      FROM contacts
      INNER JOIN users ON contacts.uid_contact = users.id
      WHERE contacts.uid_owner = $1
      `,
      [this._uid]
    );
    return result.rows;
  }

  async getFollowers(): Promise<User[]> {
    const result = await this._dbclient.query<User>(
      `
      SELECT users.id, users.name, users.username,
        users.avatar_url AS "avatarUrl"
      FROM contacts
      INNER JOIN users ON contacts.uid_owner = users.id
      WHERE contacts.uid_contact = $1
      `,
      [this._uid]
    );
    return result.rows;
  }

  async getContactRequests(): Promise<User[]> {
    const result = await this._dbclient.query(
      `
      SELECT users.id, users.name, users.username,
        users.avatar_url AS "avatarUrl"
      FROM contacts
      INNER JOIN users ON contacts.uid_owner = users.id
      WHERE contacts.uid_contact = $1
        AND contacts.kind = 0
      `,
      [this._uid]
    );
    return result.rows;
  }

  async hasContact(uidContact: string): Promise<boolean> {
    const result = await this._dbclient.query(
      `
      SELECT kind FROM contacts
      WHERE (uid_owner, uid_contact) = ($1, $2)
      `,
      [this._uid, uidContact]
    );
    if (result.rowCount === 0 || result.rows[0].kind === ContactKind.Requested) {
      return false;
    }
    return true;
  }

  async getMinUser(): Promise<MinUser> {
    const result = await this._dbclient.query<MinUser>(
      `SELECT id, name, username, avatar_url AS "avatarUrl" FROM users WHERE id = $1`,
      [this._uid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0];
  }

  async changePassword(oldPassword: string, newPassword: string) {
    const pwhashResult = await this._dbclient.query<{ pwhash: string | null }>(
      `SELECT pwhash FROM users WHERE id = $1`,
      [this._uid]
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
      [pwhash, this._uid]
    );
    if (updateResult.rowCount === 0) {
      throw new StatusError(500, 'Failed to update password');
    }
  }

  async updateUserField(field: string, value: any) {
    await this._dbclient.query(
      `UPDATE users SET "${field}" = $1 WHERE id = $2`,
      [value, this._uid]
    );
  }

  static async getIdForUsername(dbclient: PoolClient, username: string): Promise<string | null> {
    const result = await dbclient.query<{ id: string }>(
      `SELECT id FROM users WHERE lower(username) = lower($1)`,
      [username]
    )
    if (!result.rowCount) {
      return null;
    }
    return result.rows[0].id;
  }

  async getIdAndAvatar(): Promise<{ id: string; avatar_url: string | null; } | null> {
    const result = await this._dbclient.query<{ id: string; avatar_url: string | null; }>(
      `
      SELECT id, avatar_url
      FROM users
      WHERE id = $1
      `,
      [this._uid]
    );
    if (!result.rowCount) {
      return null;
    }
    return result.rows[0];
  }

  async getNameAndPublic(): Promise<{ name: string; public: string }> {
    const result = await this._dbclient.query<{ name: string; public: string }>(
      `SELECT name, public FROM users WHERE id = $1`, [this._uid]
    );
    if (!result.rowCount) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0];
  }

  async getUsername(): Promise<string> {
    const result = await this._dbclient.query<{ username: string }>(
      `SELECT username FROM users WHERE id = $1`, [this._uid]
    );
    if (!result.rowCount) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0].username;
  }

  async getNameAndUsername(): Promise<{ name: string; username: string }> {
    const result = await this._dbclient.query<{ name: string; username: string }>(
      `SELECT name, username FROM users WHERE id = $1`, [this._uid]
    );
    if (!result.rowCount) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0];
  }

  async addContact(contactUid: string, kind: ContactKind) {
    const result = await this._dbclient.query(
      `
      INSERT INTO contacts (uid_owner, uid_contact, kind)
      VALUES ($1, $2, $3)
      `,
      [this._uid, contactUid, kind]
    );
    if (!result.rowCount) {
      throw new StatusError(400, 'Contacts failed to update');
    }
  }

  async deleteContact(contactUid: string) {
    const result = await this._dbclient.query(
      `DELETE FROM contacts WHERE uid_owner = $1 AND uid_contact = $2`,
      [this._uid, contactUid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'Contact not found');
    }
  }

  async approveContact(uidOwner: string): Promise<{ uid_contact: string; name: string}> {
    const result = await this._dbclient.query<{ uid_contact: string; name: string }>(
      `
      UPDATE contacts SET contacts.kind = 1
      FROM users
      WHERE (contacts.uid_owner, contacts.uid_contact) = ($1, $2)
        AND users.id = contacts.uid_contact
      RETURNING contacts.uid_contact, users.name
      `,
      [uidOwner, this._uid]
    );
    if (!result.rowCount) {
      throw new StatusError(404, 'Contact not found');
    }
    return result.rows[0];
  }

  async denyContact(uidOwner: string): Promise<{ uid_contact: string; name: string }> {
    const result = await this._dbclient.query<{ uid_contact: string; name: string }>(
      `
      DELETE FROM contacts
      USING users
      WHERE (uid_owner, uid_contact) = ($1, $2)
        AND users.id = uid_contact
      RETURNING uid_contact, users.name
      `,
      [uidOwner, this._uid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'Contact not found');
    }
    return result.rows[0];
  }
}

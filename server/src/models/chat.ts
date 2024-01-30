import DataModel from './data.js';
import type { PoolClient } from 'pg';
import { ContactKind } from 'oi-types/user';
import { ChatMessage, ChatSummary, UnreadMessageSummary } from 'oi-types/chat';
import { StatusError } from '../util/error.js';

export default class ChatModel extends DataModel {
  _uid: string;

  constructor(client: PoolClient, uid: string) {
    super(client);
    this._uid = uid;
  }

  async getContactKind(uidContact: string): Promise<ContactKind | null> {
    const result = await this._dbclient.query<{ kind: ContactKind }>(
      `SELECT kind FROM contacts WHERE (uid_owner, uid_contact) = ($1, $2)`,
      [this._uid, uidContact]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0].kind;
  }

  async insertMessage(uidTo: string, message: string): Promise<{
    id: string;
    sent: string;
    message: string;
  }> {
    const result = await this._dbclient.query<{ id: string; sent: string; message: string; }>(
      `
      INSERT INTO user_messages (uid_from, uid_to, message)
      VALUES ($1, $2, $3)
      RETURNING id, sent, message
      `,
      [this._uid, uidTo, message]
    );
    if (result.rowCount === 0) {
      throw new StatusError(500, 'Message insert failed');
    }
    return result.rows[0];
  }

  async getNameAndChatNotification(): Promise<{
    name: string;
    username: string;
    chat: boolean;
  }> {
    const result = await this._dbclient.query<{ name: string; username: string; chat: boolean }>(
      `
      SELECT users.name, users.username, COALESCE(notification_settings.chat, TRUE) AS chat
      FROM users
      LEFT JOIN notification_settings ON users.id = notification_settings.uid
      WHERE users.id = $1
      `,
      [this._uid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'User not found');
    }
    return result.rows[0];
  }

  static async updateChatReceived(dbclient: PoolClient, id: string | string[]) {
    if (Array.isArray(id)) {
      await dbclient.query(
        `UPDATE user_messages SET received = NOW() WHERE id = ANY($1) AND received IS NULL`,
        [id]
      );
    } else {
      await dbclient.query(
        `UPDATE user_messages SET received = NOW() WHERE id = $1 AND received IS NULL`,
        [id]
      );
    }
  }

  async getMessagesInitial(uid: string, count?: number): Promise<ChatMessage[]> {
    count ??= 50;
    const result = await this._dbclient.query<ChatMessage>(
      `
      SELECT user_messages.id, user_messages.uid_from AS "from",
        user_messages.uid_to AS "to", users.name AS "fromName",
        users.username AS "fromUsername", user_messages.message AS "text",
        user_messages.sent, user_messages.received
      FROM user_messages
      INNER JOIN users ON user_messages.uid_from = users.id
      WHERE (uid_from = $1 AND uid_to = $2) OR (uid_to = $1 AND uid_from = $2)
      ORDER BY id DESC
      LIMIT ${count}
      `,
      [this._uid, uid]
    );
    return result.rows;
  }

  async getSummary(): Promise<ChatSummary[]> {
    const result = await this._dbclient.query(
      `
      SELECT DISTINCT ON (user_messages.uid_from)
        user_messages.uid_from AS uid, users.name, users.username,
        users.avatar_url AS "avatarUrl"
      FROM user_messages
      INNER JOIN users ON user_messages.uid_from = users.id
      WHERE user_messages.uid_to = $1
      UNION
      SELECT DISTINCT ON (user_messages.uid_to)
        user_messages.uid_to AS uid, users.name, users.username,
        users.avatar_url AS "avatarUrl"
      FROM user_messages
      INNER JOIN users ON user_messages.uid_to = users.id
      WHERE user_messages.uid_from = $1
      `,
      [this._uid]
    );
    return result.rows;
  }

  async getUnreadMessageCount(): Promise<UnreadMessageSummary[]> {
    const result = await this._dbclient.query<UnreadMessageSummary>(
      `
      SELECT count(*), uid_from AS uid
      FROM user_messages
      WHERE uid_to = $1 AND received IS NULL
      GROUP BY uid_from
      `,
      [this._uid]
    );
    return result.rows;
  }
}

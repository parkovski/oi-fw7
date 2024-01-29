import DataModel from './data.js';
import { StatusError } from '../util/error.js';
import { GroupChatSummary } from 'oi-types/group';

export default class GroupChatModel extends DataModel {
  async insertMessage(uidFrom: string, gid: string, text: string): Promise<{
    id: string;
    sent: string;
  }> {
    const result = await this._dbclient.query<{ id: string; sent: string }>(
      `
      INSERT INTO group_messages
      (uid_from, gid_to, message)
      VALUES ($1, $2, $3)
      RETURNING id, sent
      `,
      [uidFrom, gid, text]
    );
    if (result.rowCount === 0) {
      throw new StatusError(500, 'Message insert failed');
    }
    return result.rows[0];
  }

  async markRead(ids: string | string[], uid: string) {
    if (Array.isArray(ids)) {
      await this._dbclient.query(
        `INSERT INTO group_messages_read(mid, uid) VALUES (unnest($1::bigint array), $2)`,
        [ids, uid]
      );
    } else {
      await this._dbclient.query(
        `INSERT INTO group_messages_read(mid, uid) VALUES ($1, $2)`,
        [ids, uid]
      );
    }
  }

  async getInitialMessages(uid: string, gid: string): Promise<GroupChatSummary[]> {
    const result = await this._dbclient.query(
      `
      SELECT group_messages.id, group_messages.uid_from AS "from",
        users.name AS "fromName", users.username AS "fromUsername",
        group_messages.message, group_messages.sent,
        group_messages_read.time AS received
      FROM group_messages
      INNER JOIN users ON group_messages.uid_from = users.id
      LEFT JOIN group_messages_read ON group_messages.id = group_messages_read.mid
        AND group_messages_read.uid = $1
      WHERE group_messages.gid_to = $2
      ORDER BY group_messages.id DESC
      LIMIT 50
      `,
      [uid, gid]
    );
    return result.rows.reverse();
  }
}

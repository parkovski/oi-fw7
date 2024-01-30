import DataModel from './data.js';
import type { PoolClient } from 'pg';
import { StatusError } from '../util/error.js';
import {
  Group, Membership, GroupSummary, UnreadMessage, GroupMember, GroupChatSummary
} from 'oi-types/group';
import { EventSummary } from 'oi-types/event';

export default class GroupModel extends DataModel {
  private _gid: string;

  constructor(client: PoolClient, gid: string) {
    super(client);
    this._gid = gid;
  }

  async getGroupEvents(uid: string): Promise<EventSummary[]> {
    const result = await this._dbclient.query(
      `
      SELECT events.id, events.title, events.start_time AS "startTime",
        events.end_time AS "endTime", attendance.kind
      FROM events
      LEFT JOIN attendance ON events.id = attendance.eid
        AND attendance.uid = $1
      WHERE events.gid = $2
      `,
      [uid, this._gid]
    );
    return result.rows;
  }

  async getMembership(uid: string): Promise<Membership | null> {
    const result = await this._dbclient.query<{ kind: Membership }>(
      `SELECT kind FROM groupmems WHERE (uid, gid) = ($1, $2)`,
      [uid, this._gid]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0].kind;
  }

  async getMembershipAndPublic(uid: string): Promise<{
    kind: Membership | null;
    public: boolean;
  }> {
    const result = await this._dbclient.query<{ kind: Membership | null; public: boolean }>(
      `
      SELECT groupmems.kind, groups.public
      FROM groupmems
      RIGHT JOIN groups ON groupmems.gid = groups.id AND groupmems.uid = $1
      WHERE groups.id = $2
      `,
      [uid, this._gid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'Group not found');
    }
    return result.rows[0];
  }

  async getMemberUids(): Promise<string[]> {
    const result = await this._dbclient.query<{ uid: string }>(
      `SELECT uid FROM groupmems WHERE gid = $1`, [this._gid]
    );
    return result.rows.map(row => row.uid);
  }

  static async getGroupsForUser(dbclient: PoolClient, uid: string): Promise<GroupSummary[]> {
    const result = await dbclient.query<GroupSummary>(
      `
      SELECT groups.id, groups.name, groupmems.kind AS "memberKind"
      FROM groupmems
      INNER JOIN groups ON groupmems.gid = groups.id
      WHERE groupmems.uid = $1
      `,
      [uid]
    );
    return result.rows;
  }

  static async getUnreadMessages(dbclient: PoolClient, uid: string): Promise<UnreadMessage[]> {
    const result = await dbclient.query<UnreadMessage>(
      `
      SELECT count(*), group_messages.gid_to AS gid
      FROM group_messages
      LEFT JOIN group_messages_read ON group_messages.id = group_messages_read.mid
        AND group_messages_read.uid = $1
      WHERE group_messages.uid_from != $1 AND group_messages_read.uid IS NULL
      GROUP BY group_messages.gid_to
      `,
      [uid]
    );
    return result.rows;
  }

  static async getUpcomingEvents(dbclient: PoolClient, uid: string): Promise<UnreadMessage[]> {
    const result = await dbclient.query<UnreadMessage>(
      `
      SELECT count(*), events.gid FROM events
      INNER JOIN groupmems ON events.gid = groupmems.gid
      WHERE groupmems.uid = $1 AND start_time > NOW()
      GROUP BY events.gid
      `,
      [uid]
    );
    return result.rows;
  }

  async getBasicInfo(): Promise<Group> {
    const result = await this._dbclient.query<Group>(
      `SELECT id, name, description, public FROM groups WHERE id = $1`,
      [this._gid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'Group not found');
    }
    return result.rows[0];
  }

  async getMembers(): Promise<GroupMember[]> {
    const result = await this._dbclient.query<GroupMember>(
      `
      SELECT users.id, users.name, users.username, groupmems.kind
      FROM groupmems
      INNER JOIN users ON groupmems.uid = users.id
      WHERE groupmems.gid = $1
      `,
      [this._gid]
    );
    return result.rows;
  }

  async getUnreadMessageCount(uid: string): Promise<number> {
    const result = await this._dbclient.query<{ count: number; gid: string }>(
      `
      SELECT count(*), group_messages.gid_to AS gid
      FROM group_messages
      LEFT JOIN group_messages_read ON group_messages.id = group_messages_read.mid
        AND group_messages_read.uid = $1
      WHERE group_messages.uid_from != $1 AND group_messages_read.uid IS NULL
        AND group_messages.gid_to = $2
      GROUP BY group_messages.gid_to
      `,
      [uid, this._gid]
    );
    if (!result.rowCount) {
      return 0;
    }
    return result.rows[0].count;
  }

  async inviteUsers(uids: string[]): Promise<string[]> {
    const result = await this._dbclient.query<{ uid: string }>(
      `
      INSERT INTO groupmems
      (uid, gid, kind)
      VALUES (unnest($1::bigint array), $2, 0)
      ON CONFLICT (uid, gid) DO NOTHING
      RETURNING uid
      `,
      [uids, this._gid]
    );
    return result.rows.map(row => row.uid);
  }

  async makeAdmin(uid: string): Promise<boolean> {
    const result = await this._dbclient.query<never>(
      `
      INSERT INTO groupmems
      (uid, gid, kind)
      VALUES ($1, $2, 2)
      ON CONFLICT (uid, gid) DO UPDATE SET kind = 2
      `,
      [uid, this._gid]
    );
    return result.rowCount !== 0;
  }

  async requestToJoin(uid: string) {
    await this._dbclient.query(
      `
      INSERT INTO groupmems
      (uid, gid, kind)
      VALUES ($1, $2, -1)
      ON CONFLICT (uid, gid) DO NOTHING
      `,
      [uid, this._gid]
    );
  }

  async joinGroup(uid: string) {
    await this._dbclient.query(
      `
      INSERT INTO groupmems
      (uid, gid, kind)
      VALUES ($1, $2, 1)
      ON CONFLICT (uid, gid) DO UPDATE SET kind = 1
      `,
      [uid, this._gid]
    );
  }

  async getJoinRequests(): Promise<{ id: string; name: string; }[]> {
    const result = await this._dbclient.query<{ id: string; name: string }>(
      `
      SELECT users.id, users.name
      FROM groupmems
      INNER JOIN users ON groupmems.uid = users.id
      WHERE groupmems.gid = $1 AND groupmems.kind = -1
      `,
      [this._gid]
    );
    return result.rows;
  }

  async approveJoinRequest(uid: string) {
    await this._dbclient.query(
      `UPDATE groupmems SET kind = 1 WHERE (uid, gid, kind) = ($1, $2, -1)`,
      [uid, this._gid]
    );
  }

  async rejectJoinRequest(uid: string) {
    await this._dbclient.query(
      `DELETE FROM groupmems WHERE (uid, gid, kind) = ($1, $2, -1)`,
      [uid, this._gid]
    );
  }

  async leaveGroup(uid: string) {
    await this._dbclient.query(
      `DELETE FROM groupmems WHERE uid = $1 AND gid = $2`,
      [uid, this._gid]
    );
  }

  static async newGroup(
    dbclient: PoolClient,
    name: string,
    isPublic: boolean,
    description: string | null
  ): Promise<string> {
    const result = await dbclient.query<{ id: string }>(
      `INSERT INTO groups (name, public, description) VALUES ($1, $2, $3) RETURNING id`,
      [name, isPublic, description]
    );
    if (result.rowCount === 0) {
      throw new StatusError(500, 'Group insert failed');
    }
    return result.rows[0].id;
  }

  async deleteGroup() {
    await this._dbclient.query(
      `DELETE FROM groups WHERE id = $1`, [this._gid]
    );
  }

  async insertMessage(uidFrom: string, text: string): Promise<{
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
      [uidFrom, this._gid, text]
    );
    if (result.rowCount === 0) {
      throw new StatusError(500, 'Message insert failed');
    }
    return result.rows[0];
  }

  static async markRead(dbclient: PoolClient, ids: string | string[], uid: string) {
    if (Array.isArray(ids)) {
      await dbclient.query(
        `INSERT INTO group_messages_read(mid, uid) VALUES (unnest($1::bigint array), $2)`,
        [ids, uid]
      );
    } else {
      await dbclient.query(
        `INSERT INTO group_messages_read(mid, uid) VALUES ($1, $2)`,
        [ids, uid]
      );
    }
  }

  async getInitialMessages(uid: string, count?: number): Promise<GroupChatSummary[]> {
    count ??= 50;
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
      LIMIT ${count}
      `,
      [uid, this._gid]
    );
    return result.rows.reverse();
  }
}

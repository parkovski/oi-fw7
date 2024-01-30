import DataModel from './data.js';
import type { PoolClient } from 'pg';
import {
  Event, EventSummary, EventMember, EventComment, EventPhoto, AttendanceKind
} from 'oi-types/event';
import { Membership } from 'oi-types/group';
import { StatusError } from '../util/error.js';

export default class EventModel extends DataModel {
  private _eid: string;

  constructor(client: PoolClient, eid: string) {
    super(client);
    this._eid = eid;
  }

  async getEvent(): Promise<Event> {
    const result = await this._dbclient.query<Event>(
      `
      SELECT id, title, description, place, start_time AS "startTime",
        end_time AS "endTime", public, cover_photo AS "coverPhoto"
      FROM events
      WHERE id = $1
      `,
      [this._eid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'Event not found');
    }
    return result.rows[0];
  }

  async getAttendance(uid: string): Promise<AttendanceKind | null> {
    const result = await this._dbclient.query<{ kind: AttendanceKind }>(
      `SELECT kind FROM attendance WHERE (uid, eid) = ($1, $2)`,
      [uid, this._eid]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0].kind;
  }

  async getGroupMembership(uid: string): Promise<Membership | null> {
    const result = await this._dbclient.query<{ kind: Membership }>(
      `
      SELECT kind FROM groupmems
      WHERE (uid, gid) = ($1, (SELECT gid FROM events WHERE id = $2))
      `,
      [uid, this._eid]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0].kind;
  }

  async getInviteList(): Promise<EventMember[]> {
    const result = await this._dbclient.query<EventMember>(
      `
      SELECT users.id, users.name, users.username, attendance.kind
      FROM attendance
      INNER JOIN users ON attendance.uid = users.id
      WHERE attendance.eid = $1
      `,
      [this._eid]
    );
    return result.rows;
  }

  async getCommentsList(): Promise<EventComment[]> {
    const result = await this._dbclient.query<EventComment>(
      `
      SELECT event_comments.id, users.id AS "from", users.name AS "fromName",
        users.avatar_url AS "avatarUrl", event_comments.message
      FROM event_comments
      LEFT JOIN users ON event_comments.uid_from = users.id
      WHERE event_comments.eid = $1
      `,
      [this._eid]
    );
    return result.rows;
  }

  async getPhotos(): Promise<EventPhoto[]> {
    const result = await this._dbclient.query<EventPhoto>(
      `SELECT filename AS url, thumbnail FROM event_photos WHERE eid = $1`,
      [this._eid]
    );
    return result.rows;
  }

  async insertComment(uid: string, text: string) {
    const result = await this._dbclient.query<{ id: string }>(
      `
      INSERT INTO event_comments (eid, uid_from, message)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [this._eid, uid, text]
    );
    if (result.rowCount === 0) {
      throw new StatusError(500, 'Message insert failed');
    }
    return result.rows[0].id;
  }

  async setAttendance(uid: string, kind: AttendanceKind): Promise<boolean> {
    const result = await this._dbclient.query(
      `
      INSERT INTO attendance (uid, eid, kind)
      VALUES ($1, $2, $3)
      ON CONFLICT (uid, eid) DO UPDATE SET kind = $3
      WHERE attendance.kind != 3
      `,
      [uid, this._eid, kind]
    );
    return result.rowCount! > 0;
  }

  async getHosts(): Promise<string[]> {
    const result = await this._dbclient.query<{ id: string }>(
      `
      SELECT users.id
      FROM attendance
      INNER JOIN users ON attendance.uid = users.id
      WHERE attendance.eid = $1 AND attendance.kind = 3
      `,
      [this._eid]
    );
    return result.rows.map(row => row.id);
  }

  async getTitle(): Promise<string> {
    const result = await this._dbclient.query<{ title: string }>(
      `SELECT title FROM events WHERE id = $1`, [this._eid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'Event not found');
    }
    return result.rows[0].title;
  }

  async getAttendanceInfo(uid: string): Promise<{
    kind: AttendanceKind | null;
    public: boolean;
    title: string;
  }> {
    const result = await this._dbclient.query<{
      kind: AttendanceKind | null;
      public: boolean;
      title: string;
    }>(
      `
      SELECT attendance.kind, events.public, events.title
      FROM attendance
      RIGHT JOIN events ON attendance.eid = events.id AND attendance.uid = $1
      WHERE events.id = $2
      `,
      [uid, this._eid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'Event not found');
    }
    return result.rows[0];
  }

  // Returns uids actually invited which may be different than `uids`.
  async inviteUsers(uids: string[]): Promise<string[]> {
    const result = await this._dbclient.query<{ uid: string }>(
      `
      INSERT INTO attendance (uid, eid, kind)
      VALUES (unnest($1::bigint array), $2, 0)
      ON CONFLICT (uid, eid) DO NOTHING
      RETURNING uid
      `,
      [uids, this._eid]
    );
    return result.rows.map(row => row.uid);
  }

  async getAttendingUsers(uids: string[]): Promise<{
    uid: string;
    kind: AttendanceKind;
  }[]> {
    const result = await this._dbclient.query<{ uid: string; kind: AttendanceKind; }>(
      `SELECT uid, kind FROM attendance WHERE uid = ANY($1::bigint array) AND eid = $2`,
      [uids, this._eid]
    );
    return result.rows;
  }

  async convertToHosts(uids: string[]) {
    await this._dbclient.query(
      `UPDATE attendance SET kind = 3 WHERE uid = ANY($1) AND eid = $2`,
      [uids, this._eid]
    );
  }

  // Returns the new event's ID.
  static async newEvent(
    dbclient: PoolClient,
    title: string,
    description: string | null,
    createdBy: string,
    place: string | null,
    startTime: Date,
    endTime: Date,
    isPublic: boolean,
    coverPhotoFilename: string | null,
    gid: string | null,
  ): Promise<string> {
    const result = await dbclient.query<{ id: string }>(
      `
      INSERT INTO events
      (title, description, created_by, place, start_time, end_time, public,
        cover_photo, gid)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
      `,
      [title, description, createdBy, place, startTime, endTime, isPublic, coverPhotoFilename, gid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(500, 'Event creation failed');
    }
    return result.rows[0].id;
  }

  async addHost(uid: string) {
    await this._dbclient.query(
      `
      INSERT INTO attendance (uid, eid, kind)
      VALUES ($1, $2, 3)
      `,
      [uid, this._eid]
    );
  }

  async addPhoto(uid: string, filename: string, thumbnail: string) {
    await this._dbclient.query(
      `
      INSERT INTO event_photos(eid, uid_from, filename, thumbnail)
      VALUES ($1, $2, $3, $4)
      `,
      [this._eid, uid, filename, thumbnail]
    );
  }
}

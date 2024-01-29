import DataModel from './data.js';
import {
  Event, EventSummary, EventMember, EventComment, EventPhoto, AttendanceKind
} from 'oi-types/event';
import { Membership } from 'oi-types/group';
import { StatusError } from '../util/error.js';

export default class EventModel extends DataModel {
  async getUserSummary(uid: string): Promise<EventSummary[]> {
    const result = await this._dbclient.query<EventSummary>(
      `
      SELECT events.id, events.title, events.start_time AS "startTime",
        events.end_time AS "endTime", events.public, attendance.kind
      FROM attendance
      INNER JOIN events ON attendance.eid = events.id
      WHERE attendance.uid = $1 AND events.gid IS NULL
      `,
      [uid]
    );
    return result.rows;
  }

  async getEvent(id: string): Promise<Event> {
    const result = await this._dbclient.query<Event>(
      `
      SELECT id, title, description, place, start_time AS "startTime",
        end_time AS "endTime", public, cover_photo AS "coverPhoto"
      FROM events
      WHERE id = $1
      `,
      [id]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'Event not found');
    }
    return result.rows[0];
  }

  async getAttendance(uid: string, eid: string): Promise<AttendanceKind | null> {
    const result = await this._dbclient.query<{ kind: AttendanceKind }>(
      `SELECT kind FROM attendance WHERE (uid, eid) = ($1, $2)`,
      [uid, eid]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0].kind;
  }

  async getGroupMembership(uid: string, eid: string): Promise<Membership | null> {
    const result = await this._dbclient.query<{ kind: Membership }>(
      `
      SELECT kind FROM groupmems
      WHERE (uid, gid) = ($1, (SELECT gid FROM events WHERE id = $2))
      `,
      [uid, eid]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0].kind;
  }

  async getInviteList(eid: string): Promise<EventMember[]> {
    const result = await this._dbclient.query<EventMember>(
      `
      SELECT users.id, users.name, users.username, attendance.kind
      FROM attendance
      INNER JOIN users ON attendance.uid = users.id
      WHERE attendance.eid = $1
      `,
      [eid]
    );
    return result.rows;
  }

  async getCommentsList(eid: string): Promise<EventComment[]> {
    const result = await this._dbclient.query<EventComment>(
      `
      SELECT event_comments.id, users.id AS "from", users.name AS "fromName",
        users.avatar_url AS "avatarUrl", event_comments.message
      FROM event_comments
      LEFT JOIN users ON event_comments.uid_from = users.id
      WHERE event_comments.eid = $1
      `,
      [eid]
    );
    return result.rows;
  }

  async getPhotos(eid: string): Promise<EventPhoto[]> {
    const result = await this._dbclient.query<EventPhoto>(
      `SELECT filename AS url, thumbnail FROM event_photos WHERE eid = $1`,
      [eid]
    );
    return result.rows;
  }

  async getGroupEvents(uid: string, gid: string): Promise<EventSummary[]> {
    const result = await this._dbclient.query(
      `
      SELECT events.id, events.title, events.start_time AS "startTime",
        events.end_time AS "endTime", attendance.kind
      FROM events
      LEFT JOIN attendance ON events.id = attendance.eid
        AND attendance.uid = $1
      WHERE events.gid = $2
      `,
      [uid, gid]
    );
    return result.rows;
  }

  async insertComment(eid: string, uid: string, text: string) {
    const result = await this._dbclient.query<{ id: string }>(
      `
      INSERT INTO event_comments (eid, uid_from, message)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [eid, uid, text]
    );
    if (result.rowCount === 0) {
      throw new StatusError(500, 'Message insert failed');
    }
    return result.rows[0].id;
  }

  async setAttendance(uid: string, eid: string, kind: AttendanceKind): Promise<boolean> {
    const result = await this._dbclient.query(
      `
      INSERT INTO attendance (uid, eid, kind)
      VALUES ($1, $2, $3)
      ON CONFLICT (uid, eid) DO UPDATE SET kind = $3
      WHERE attendance.kind != 3
      `,
      [uid, eid, kind]
    );
    return result.rowCount! > 0;
  }

  async getHosts(eid: string): Promise<string[]> {
    const result = await this._dbclient.query<{ id: string }>(
      `
      SELECT users.id
      FROM attendance
      INNER JOIN users ON attendance.uid = users.id
      WHERE attendance.eid = $1 AND attendance.kind = 3
      `,
      [eid]
    );
    return result.rows.map(row => row.id);
  }

  async getTitle(eid: string): Promise<string> {
    const result = await this._dbclient.query<{ title: string }>(
      `SELECT title FROM events WHERE id = $1`, [eid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'Event not found');
    }
    return result.rows[0].title;
  }

  async getAttendanceInfo(uid: string, eid: string): Promise<{
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
      [uid, eid]
    );
    if (result.rowCount === 0) {
      throw new StatusError(404, 'Event not found');
    }
    return result.rows[0];
  }

  // Returns uids actually invited which may be different than `uids`.
  async inviteUsers(eid: string, uids: string[]): Promise<string[]> {
    const result = await this._dbclient.query<{ uid: string }>(
      `
      INSERT INTO attendance (uid, eid, kind)
      VALUES (unnest($1::bigint array), $2, 0)
      ON CONFLICT (uid, eid) DO NOTHING
      RETURNING uid
      `,
      [uids, eid]
    );
    return result.rows.map(row => row.uid);
  }

  async getAttendingUsers(eid: string, uids: string[]): Promise<{
    uid: string;
    kind: AttendanceKind;
  }[]> {
    const result = await this._dbclient.query<{ uid: string; kind: AttendanceKind; }>(
      `SELECT uid, kind FROM attendance WHERE uid = ANY($1::bigint array) AND eid = $2`,
      [uids, eid]
    );
    return result.rows;
  }

  async convertToHosts(eid: string, uids: string[]) {
    await this._dbclient.query(
      `UPDATE attendance SET kind = 3 WHERE uid = ANY($1) AND eid = $2`,
      [uids, eid]
    );
  }

  // Returns the new event's ID.
  async newEvent(
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
    const result = await this._dbclient.query<{ id: string }>(
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

  async addHost(eid: string, uid: string) {
    await this._dbclient.query(
      `
      INSERT INTO attendance (uid, eid, kind)
      VALUES ($1, $2, 3)
      `,
      [uid, eid]
    );
  }

  async addPhoto(eid: string, uid: string, filename: string, thumbnail: string) {
    await this._dbclient.query(
      `
      INSERT INTO event_photos(eid, uid_from, filename, thumbnail)
      VALUES ($1, $2, $3, $4)
      `,
      [eid, uid, filename, thumbnail]
    );
  }
}

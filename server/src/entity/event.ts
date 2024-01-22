import type { Request, Response } from 'express';
import { getPool, getUserId } from '../util/db.js';
import type { UploadedFile } from 'express-fileupload';
import { handleError, StatusError } from '../util/error.js';
import {
  validateUuid, validateNumeric, validateMinMaxLength,
  validateFutureDate, validateBoolean, validateArrayEach,
  validateMaybeNegative,
} from '../util/validation.js';
import wsclients from '../server/wsclients.js';
import {
  AttendanceKind, EventMember, Event, EventSummary, EventComment,
} from 'oi-types/event';
import {
  EventAddedMessage, EventAttendanceChangedMessage, EventRespondedMessage,
} from 'oi-types/message';
import PhotoModel from '../models/photo.js';

export async function getEvents(req: Request, res: Response) {
  try {
    const session = validateUuid(req.cookies.session, 401);
    const eventResult = await getPool().query<EventSummary>(
      `
      SELECT events.id, events.title, events.start_time AS "startTime",
        events.end_time AS "endTime", events.public, attendance.kind
      FROM sessions
      INNER JOIN attendance ON sessions.uid = attendance.uid
      INNER JOIN events ON attendance.eid = events.id
      WHERE sessions.sesskey = $1
      `,
      [session]
    );
    res.json(eventResult.rows);
  } catch (e) {
    handleError(e, res);
  } finally {
    res.end();
  }
}

export async function getEventInfo(req: Request, res: Response) {
  let client;

  try {
    const session = req.cookies.session;
    const eid = validateNumeric(req.params.eid);

    client = await getPool().connect();

    const eventResult = await client.query<Event>(
      `
      SELECT id, title, description, place, start_time AS "startTime",
        end_time AS "endTime", public, cover_photo AS "coverPhoto"
      FROM events
      WHERE id = $1
      `,
      [eid]
    );
    if (eventResult.rowCount === 0) {
      res.status(404);
      return;
    }

    const eventInfo = eventResult.rows[0];
    eventInfo.kind = null;

    if (!session) {
      res.json(eventInfo);
      return;
    } else {
      validateUuid(session);
    }

    // Check that I am invited to the event before listing invitees.
    const attendanceResult = await client.query<{ kind: AttendanceKind }>(
      `
      SELECT attendance.kind
      FROM sessions
      INNER JOIN attendance ON sessions.uid = attendance.uid
      WHERE sessions.sesskey = $1 AND attendance.eid = $2
      `,
      [session, eid]
    );
    if (attendanceResult.rowCount === 0) {
      res.json(eventInfo);
      return;
    } else {
      eventInfo.kind = attendanceResult.rows[0].kind;
    }

    // Get the invite list
    const memberResult = await client.query<EventMember>(
      `
      SELECT users.id, users.name, users.username, attendance.kind
      FROM attendance
      INNER JOIN users ON attendance.uid = users.id
      WHERE attendance.eid = $1
      `,
      [eid]
    );
    if (memberResult.rowCount) {
      eventInfo.members = memberResult.rows;
    }

    // Get the comments list
    const commentsResult = await client.query<EventComment>(
      `
      SELECT event_comments.id, users.id AS "from", users.name AS "fromName",
        users.avatar_url AS "avatarUrl", event_comments.message
      FROM event_comments
      LEFT JOIN users ON event_comments.uid_from = users.id
      WHERE event_comments.eid = $1
      `,
      [eid]
    );
    if (commentsResult.rowCount) {
      eventInfo.comments = commentsResult.rows;
    }
    res.json(eventInfo);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function postEventComment(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const eid = validateNumeric(req.params.eid);
    const text = validateMinMaxLength(req.body.text, 1, 2000);

    client = await getPool().connect();

    const result = await client.query<{ id: string }>(
      `
      INSERT INTO event_comments
      (eid, uid_from, message)
      VALUES ($1, (SELECT uid FROM sessions WHERE sesskey = $2), $3)
      RETURNING id
      `,
      [eid, session, text]
    );
    if (!result.rowCount) {
      res.status(500);
      return;
    }
    res.write(result.rows[0].id);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function setEventAttendance(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const eid = validateNumeric(req.params.eid);
    const kind = +validateMaybeNegative(req.body.kind);
    switch (kind) {
    case -1: case 1: case 2: break;
    default: throw new StatusError('Invalid attendance kind');
    }

    client = await getPool().connect();

    const myUid = await getUserId(client, session);

    // Update attendance only if not hosting.
    const attendanceResult = await client.query(
      `UPDATE attendance SET kind = $1 WHERE (uid, eid) = ($2, $3) AND (kind != 3)`,
      [kind, myUid, eid]
    );
    if (attendanceResult.rowCount === 0) {
      res.status(404);
    } else {
      wsclients.sendWs<EventAttendanceChangedMessage>(myUid, {
        m: 'event_attendance_changed',
        id: eid,
        kind,
      });
      res.write('' + kind);

      const [myName, hosts, title, wantsNotification] = await Promise.all([
        client.query(
          `SELECT name FROM users WHERE id = $1`, [myUid]
        ),
        client.query(
          `
          SELECT users.id
          FROM attendance
          INNER JOIN users ON attendance.uid = users.id
          WHERE attendance.eid = $1 AND attendance.kind = 3
          `,
          [eid]
        ),
        client.query(
          `SELECT title FROM events WHERE id = $1`, [eid]
        ),
        client.query(
          `SELECT event_responded FROM notification_settings WHERE uid = $1`,
          [myUid]
        ),
      ]);
      // Notify the hosts.
      const message: EventRespondedMessage = {
        m: 'event_responded',
        id: eid,
        name: myName.rows[0].name,
        kind,
        title: title.rows[0].title,
      };
      wsclients.sendWsAndPush(
        hosts.rows.map(row => row.id), message, wantsNotification.rows[0].event_responded
      );
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function inviteToEvent(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const eid = validateNumeric(req.params.eid);
    const invitedUids = validateArrayEach(req.body.uids, validateNumeric);
    if (!invitedUids.length) {
      throw new StatusError(400, 'Missing uid(s)');
    }

    client = await getPool().connect();

    const loggedInUid = await getUserId(client, session);

    // Make sure I am in the event's member list
    const memberResult = await client.query<{
      kind: AttendanceKind;
      public: boolean;
      title: string;
    }>(
      `
      SELECT attendance.kind, events.public, events.title
      FROM attendance
      RIGHT JOIN events ON attendance.eid = events.id AND attendance.uid = $1
      WHERE events.id = $2
      `,
      [loggedInUid, eid]
    );
    if (memberResult.rowCount === 0) {
      res.status(404);
      return;
    }
    if (!memberResult.rows[0].public && memberResult.rows[0].kind === null) {
      res.status(403);
      return;
    }

    const insertResult = await client.query<{ uid: string }>(
      `
      INSERT INTO attendance (uid, eid, kind)
      VALUES (unnest($1::bigint array), $2, 0)
      ON CONFLICT (uid, eid) DO NOTHING
      RETURNING uid
      `,
      [invitedUids, eid]
    );

    const notificationResult = await client.query<{ event_added: boolean }>(
      `
      SELECT COALESCE(notification_settings.event_added, TRUE) AS event_added
      FROM users
      LEFT JOIN notification_settings ON users.id = notification_settings.uid
      WHERE users.id = ANY($1::bigint array)
      `,
      [insertResult.rows.map(row => row.uid)]
    );

    const msg: EventAddedMessage = {
      m: 'event_added',
      id: eid,
      title: memberResult.rows[0].title
    }
    for (let i = 0; i < insertResult.rowCount!; ++i) {
      wsclients.sendWsOrPush(
        insertResult.rows[i].uid, msg, notificationResult.rows[i].event_added);
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function makeEventHost(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const eid = validateNumeric(req.params.eid);
    const invitedUids = validateArrayEach(req.body.uids, validateNumeric);
    if (!invitedUids.length) {
      throw new StatusError(400, 'Missing uid(s)');
    }

    client = await getPool().connect();

    // Make sure I am a host first.
    const hostingResult = await client.query<{ kind: AttendanceKind }>(
      `
      SELECT kind
      FROM attendance
      WHERE (uid, eid) = ((SELECT uid FROM sessions WHERE sesskey = $1), $2)
      `,
      [session, eid]
    );
    if (hostingResult.rowCount === 0) {
      res.status(404);
      return;
    }
    if (hostingResult.rows[0].kind !== AttendanceKind.Hosting) {
      res.status(403);
      return;
    }

    // Only invite users that are marked as attending.
    const attendanceResult = await client.query<{ uid: string; kind: AttendanceKind }>(
      `SELECT uid, kind FROM attendance WHERE uid = ANY($1::bigint array) AND eid = $2`,
      [invitedUids, eid]
    );
    const toInvite = [];
    for (const row of attendanceResult.rows) {
      if (row.kind === AttendanceKind.Attending) {
        toInvite.push(row.uid);
      }
    }
    if (toInvite.length) {
      await client.query(
        `UPDATE attendance SET kind = 3 WHERE uid = ANY($1) AND eid = $2`,
        [toInvite, eid]
      );
      const titleResult = await client.query(
        `SELECT title FROM events WHERE id = $1`, [eid]
      );
      const message: EventAttendanceChangedMessage = {
        m: 'event_attendance_changed',
        id: eid,
        kind: AttendanceKind.Hosting,
        title: titleResult.rows[0].title,
      };
      const wantsPush = await client.query<{ event_attendance_changed: boolean }>(
        `
        SELECT COALESCE(event_attendance_changed, TRUE) AS event_attendance_changed
        FROM users
        LEFT JOIN notification_settings ON users.id = notification_settings.uid
        WHERE users.id = ANY($1::bigint array)
        `,
        [toInvite]
      );
      toInvite.forEach((uid, index) =>
        wsclients.sendWsAndPush(uid, message, wantsPush.rows[index].event_attendance_changed));
    } else {
      res.status(400).write('Selected users are not marked as attending');
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
  }
}

export async function newEvent(req: Request, res: Response) {
  let client;

  try {
    const session: string = validateUuid(req.cookies.session, 401);
    const title: string = validateMinMaxLength(req.body.title?.trim(), 1, 255);
    const description: string | null = req.body.description?.trim() || null;
    const place: string | null = req.body.place?.trim() || null;
    const startTime = validateFutureDate(req.body.startTime);
    const endTime = validateFutureDate(req.body.endTime);
    const isPublic: boolean = validateBoolean(req.body.public);
    const invited = validateArrayEach(req.body.invited || [], validateNumeric);
    const coverPhoto = req.files?.coverPhoto as UploadedFile | undefined;

    if (place) {
      validateMinMaxLength(place, 1, 255);
    }
    if (description) {
      validateMinMaxLength(description, 0, 1000);
    }
    if (endTime.valueOf() < startTime.valueOf()) {
      throw new StatusError('Event ends before it starts');
    }

    client = await getPool().connect();
    const uid = await getUserId(client, session);

    let coverPhotoFilename = null;
    if (coverPhoto) {
      const photo = new PhotoModel(coverPhoto);
      const { filename } = await photo.upload({
        allowedExtensions: ['.png', '.jpg', '.jpeg']
      });
      coverPhotoFilename = filename;
      console.log('cover photo = ' + coverPhotoFilename);
    }

    let newEventResult = await client.query<{ id: string; title: string }>(
      `
      INSERT INTO events
      (title, description, created_by, place, start_time, end_time, public,
        cover_photo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
      `,
      [title, description, uid, place, startTime, endTime, isPublic, coverPhotoFilename]
    );
    if (newEventResult.rowCount === 0) {
      res.status(400);
      return;
    }
    const eid = newEventResult.rows[0].id;

    // Add myself as a host (kind 3).
    await client.query(
      `
      INSERT INTO attendance (uid, eid, kind)
      VALUES ($1, $2, 3)
      `,
      [uid, eid]
    );

    const eventAddedMessage: EventAddedMessage = {
      m: 'event_added',
      id: eid,
      title,
    };
    wsclients.sendWs(uid, eventAddedMessage);

    if (invited.length) {
      await client.query(
        `INSERT INTO attendance (uid, eid, kind) VALUES (unnest($1::bigint array), $2, 0)`,
        [invited, eid]
      );
      const wantsPush = await client.query<{ event_added: boolean }>(
        `
        SELECT COALESCE(event_added, TRUE) AS event_added
        FROM users
        LEFT JOIN notification_settings ON users.id = notification_settings.uid
        WHERE users.id = ANY($1::bigint array)
        `,
        [invited]
      );
      for (let i = 0; i < invited.length; ++i) {
        wsclients.sendWsAndPush(invited[i], eventAddedMessage, wantsPush.rows[i].event_added);
      }
    }

    res.write(eid);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

import type { Request, Response } from 'express';
import { getPool, getUserId } from '../util/db.js';
import { handleError, StatusError } from '../util/error.js';
import {
  validateUuid, validateNumeric, validateMinMaxLength,
  validateFutureDate, validateBoolean, validateArrayEach,
  validateMaybeNegative,
} from '../util/validation.js';
import wsclients from '../server/wsclients.js';
import {
  AttendanceKind, EventMember, Event, EventSummary
} from 'oi-types/event';

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
        end_time AS "endTime", public
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
    res.json(eventInfo);
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

    // Update attendance only if not hosting.
    const attendanceResult = await client.query(
      `
      UPDATE attendance
      SET kind = $1
      WHERE (uid, eid) = ((SELECT uid FROM sessions WHERE sesskey = $2), $3)
        AND (kind != 3)
      `,
      [kind, session, eid]
    );
    if (attendanceResult.rowCount === 0) {
      res.status(400);
    } else {
      res.write('' + kind);
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
    const memberResult = await client.query<{ kind: AttendanceKind; public: boolean }>(
      `
      SELECT attendance.kind, events.public
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

    await client.query(
      `
      INSERT INTO attendance (uid, eid, kind)
      VALUES (unnest($1::bigint array), $2, 0)
      ON CONFLICT (uid, eid) DO NOTHING
      `,
      [invitedUids, eid]
    );
    const msg = {
      m: 'event_added',
      id: eid,
    }
    for (let uid of invitedUids) {
      wsclients.getSender(uid).sendJson(msg);
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
    } else {
      res.status(400).write('No rows updated');
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

    let newEventResult = await client.query<{ id: string }>(
      `
      INSERT INTO events
      (title, description, created_by, place, start_time, end_time, public)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [title, description, uid, place, startTime, endTime, isPublic]
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

    if (invited.length) {
      await client.query(
        `INSERT INTO attendance (uid, eid, kind) VALUES (unnest($1::bigint array), $2, 0)`,
        [invited, eid]
      );
      const msg = { m: 'event_added', id: eid };
      for (let uid of invited) {
        wsclients.getSender(uid).sendJson(msg);
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

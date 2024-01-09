import type { Request, Response } from 'express';
import { getPool, getUserId } from '../util/db.js';
import { handleError, StatusError } from '../util/error.js';
import {
  validateUuid, validateNumeric, validateMinMaxLength, validateFutureDate,
  validateMaybeNegative,
} from '../util/validation.js';
import wsclients from '../server/wsclients.js';
import {
  GroupEventSummary, GroupEvent, EventMember, Membership,
} from 'oi-types/group';
import { GroupEventCreatedMessage } from 'oi-types/message';

export async function getGroupEvents(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const gid = validateNumeric(req.params.gid);

    client = await getPool().connect();
    const myUid = await getUserId(client, session);

    const membershipResult = await client.query<{ kind: Membership }>(
      `SELECT kind FROM groupmems WHERE (uid, gid) = ($1, $2)`,
      [myUid, gid]
    );
    if (membershipResult.rowCount === 0 || membershipResult.rows[0].kind < Membership.Member) {
      res.status(403);
      return;
    }

    const eventResult = await client.query<GroupEventSummary>(
      `
      SELECT group_events.id, group_events.title,
        group_events.start_time AS "startTime", group_events.end_time AS "endTime",
        group_attendance.kind
      FROM group_events
      LEFT JOIN group_attendance ON group_events.id = group_attendance.eid
        AND group_attendance.uid = $1
      WHERE group_events.gid = $2
      `,
      [myUid, gid]
    );
    res.json(eventResult.rows);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function getGroupEventInfo(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const eid = validateNumeric(req.params.eid);

    client = await getPool().connect();
    const myUid = await getUserId(client, session);

    // Make sure I am in the group.
    const membershipResult = await client.query<{ kind: Membership }>(
      `
      SELECT kind FROM groupmems
      WHERE (uid, gid) = ($1, (SELECT gid FROM group_events WHERE id = $2))
      `,
      [myUid, eid]
    );
    if (membershipResult.rowCount === 0 || membershipResult.rows[0].kind < Membership.Member) {
      res.status(403);
      return;
    }

    // Get the event info
    const eventResult = await client.query<GroupEvent>(
      `
      SELECT group_events.id, group_events.gid, group_events.title,
        group_events.description, group_events.place,
        group_events.start_time AS "startTime",
        group_events.end_time AS "endTime", group_attendance.kind
      FROM group_events
      LEFT JOIN group_attendance ON group_events.id = group_attendance.eid
        AND group_attendance.uid = $1
      WHERE id = $2
      `,
      [myUid, eid]
    );
    if (eventResult.rowCount === 0) {
      res.status(404);
      return;
    }
    const eventInfo = eventResult.rows[0];

    // Get the attendance list
    const memberResult = await client.query<EventMember>(
      `
      SELECT users.id, users.name, users.username, group_attendance.kind
      FROM group_attendance
      INNER JOIN users ON group_attendance.uid = users.id
      WHERE group_attendance.eid = $1
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

export async function newGroupEvent(req: Request, res: Response) {
  let client;

  try {
    const session: string = validateUuid(req.cookies.session, 401);
    const gid: string = validateNumeric(req.params.gid);
    const title: string = validateMinMaxLength(req.body.title?.trim(), 1, 255);
    const description: string | null = req.body.description?.trim() || null;
    const place: string | null = req.body.place?.trim() || null;
    const startTime = validateFutureDate(req.body.startTime);
    const endTime = validateFutureDate(req.body.endTime);

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

    // Make sure I am in the group.
    const membershipResult = await client.query<{ kind: Membership }>(
      `SELECT kind FROM groupmems WHERE (uid, gid) = ($1, $2)`,
      [uid, gid]
    );
    if (membershipResult.rowCount === 0 || membershipResult.rows[0].kind < Membership.Member) {
      res.status(403);
      return;
    }

    let newEventResult = await client.query<{ id: string }>(
      `
      INSERT INTO group_events
      (gid, title, description, created_by, place, start_time, end_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [gid, title, description, uid, place, startTime, endTime]
    );
    if (newEventResult.rowCount === 0) {
      res.status(400);
      return;
    }
    const eid = newEventResult.rows[0].id;

    // Add myself as a host (kind 3).
    await client.query(
      `
      INSERT INTO group_attendance (uid, eid, kind)
      VALUES ($1, $2, 3)
      `,
      [uid, eid]
    );

    // Notify all group members.
    const membersResult = await client.query<{ uid: string }>(
      `SELECT uid FROM groupmems WHERE gid = $1`,
      [gid]
    );
    const newEventMsg: GroupEventCreatedMessage = {
      m: 'group_event_created',
      gid,
      eid,
    };
    membersResult.rows.forEach(row => {
      wsclients.getSender(row.uid).sendJson(newEventMsg);
    });

    res.write(eid);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function setGroupEventAttendance(req: Request, res: Response) {
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

    const attendanceResult = await client.query(
      `
      INSERT INTO group_attendance (uid, eid, kind)
      VALUES ((SELECT uid FROM sessions WHERE sesskey = $1), $2, $3)
      ON CONFLICT (uid, eid) DO UPDATE SET kind = $3
      WHERE group_attendance.kind != 3
      `,
      [session, eid, kind]
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

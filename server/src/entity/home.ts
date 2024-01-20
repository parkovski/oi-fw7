import type { Request, Response } from 'express';
import { getPool } from '../util/db.js';
import { handleError } from '../util/error.js';
import { Summary } from 'oi-types/summary';
import { AttendanceKind } from 'oi-types/event';
import SessionModel from '../models/session.js';

interface GroupInviteSummary {
  id: string;
  name: string;
}

interface EventSummary {
  id: string;
  title: string;
  kind: AttendanceKind;
  start_time: string;
}

export async function getHomeSummary(req: Request, res: Response) {
  let client;

  try {
    client = await getPool().connect();

    const session = new SessionModel(client, req.cookies.session);
    const myUid = await session.getUserId();

    const summary: Summary[] = [];

    const groupInvites = await client.query<GroupInviteSummary>(
      `
      SELECT groups.id, groups.name
      FROM groupmems
      INNER JOIN groups ON groupmems.gid = groups.id
      WHERE groupmems.uid = $1 AND groupmems.kind = 0
      `,
      [myUid]
    );
    groupInvites.rows.forEach(row => {
      summary.push({
        id: `groupinvite:${row.id}`,
        name: row.name,
      });
    });

    const events = await client.query<EventSummary>(
      `
      SELECT events.id, events.title, attendance.kind, events.start_time
      FROM attendance
      INNER JOIN events ON attendance.eid = events.id
      WHERE attendance.uid = $1 AND events.start_time > NOW()
        AND attendance.kind >= 0
      ORDER BY events.start_time
      LIMIT 3
      `,
      [myUid]
    );
    events.rows.forEach(row => {
      summary.push({
        id: `event:${row.id}`,
        name: row.title,
        date: row.start_time,
      });
    });

    res.json(summary);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function storePushEndpoint(req: Request, res: Response) {
  let client;
  try {
    const endpoint = req.body.endpoint;
    const p256dh = req.body.p256dh;
    const auth = req.body.auth;

    client = await getPool().connect();

    const session = new SessionModel(client, req.cookies.session);
    if (!await session.setPushEndpoint(endpoint, p256dh, auth)) {
      res.status(404).write('Set push endpoint failed');
    } else {
      res.write('ok');
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

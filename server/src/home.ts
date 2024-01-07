import type { Request, Response } from 'express';
import { getPool, getUserId } from './db.js';
import { handleError } from './error.js';
import { validateUuid } from './validation.js';
import { HomeItem } from 'oi-types/home';
import { AttendanceKind } from 'oi-types/event';

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
    const session = validateUuid(req.cookies.session, 401);

    client = await getPool().connect();

    const myUid = await getUserId(client, session);

    const summary: HomeItem[] = [];

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

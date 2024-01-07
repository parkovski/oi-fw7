import type { Request, Response } from 'express';
import { getPool, getUserId } from './db.js';
import wsclients from './wsclients.js';
import { handleError, StatusError } from './error.js';
import {
  validateUuid, validateNumeric, validateArrayEach, validateMinMaxLength,
  validateBoolean,
} from './validation.js';
import {
  Membership, GroupSummary, GroupMember, Group,
} from 'oi-types/group';

export interface Unread {
  count: number;
  gid: string;
}

export async function getGroups(req: Request, res: Response) {
  let client;
  try {
    const session = validateUuid(req.cookies.session, 401);

    client = await getPool().connect();

    const myUid = await getUserId(client, session);

    const summary = await client.query<GroupSummary>(
      `
      SELECT groups.id, groups.name, groupmems.kind AS "memberKind"
      FROM groupmems
      INNER JOIN groups ON groupmems.gid = groups.id
      WHERE groupmems.uid = $1
      `,
      [myUid]
    );

    const unreadMessages = await client.query<Unread>(
      `
      SELECT count(*), group_messages.gid_to AS gid
      FROM group_messages
      LEFT JOIN group_messages_read ON group_messages.id = group_messages_read.mid
        AND group_messages_read.uid = $1
      WHERE group_messages.uid_from != $1 AND group_messages_read.uid IS NULL
      GROUP BY group_messages.gid_to
      `,
      [myUid]
    );
    const unreadMap = new Map<string, Unread>();
    unreadMessages.rows.forEach(row => {
      unreadMap.set(row.gid, row);
    })
    summary.rows.forEach(row => {
      row.unreadMessages = unreadMap.get(row.id)?.count;
    });

    const upcomingEvents = await client.query<Unread>(
      `
      SELECT count(*), group_events.gid FROM group_events
      INNER JOIN groupmems ON group_events.gid = groupmems.gid
      WHERE groupmems.uid = $1 AND start_time > NOW()
      GROUP BY group_events.gid
      `,
      [myUid]
    );
    unreadMap.clear();
    upcomingEvents.rows.forEach(row => {
      unreadMap.set(row.gid, row);
    });
    summary.rows.forEach(row => {
      row.upcomingEvents = unreadMap.get(row.id)?.count;
    });

    res.json(summary.rows);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function getGroupInfo(req: Request, res: Response) {
  let client;

  try {
    const session = req.cookies.session;
    const gid: string = validateNumeric(req.params.gid);

    client = await getPool().connect();

    const basicInfo = await client.query<Group>(
      `SELECT id, name, public FROM groups WHERE id = $1`,
      [gid]
    );
    if (basicInfo.rowCount === 0) {
      res.status(404);
      return;
    }

    const groupInfo = basicInfo.rows[0];
    groupInfo.memberKind = null;

    if (!session) {
      res.json(groupInfo);
      return;
    }

    const myUid = await getUserId(client, session);

    // Check that the logged in user is in the group before listing members.
    const myMembership = await client.query<{ kind: Membership }>(
      `SELECT kind FROM groupmems WHERE uid = $1 AND gid = $2`,
      [myUid, gid]
    );
    if (myMembership.rowCount === 0) {
      // Not a group member, so just reply with group name and public/private.
      // memberKind is already null here.
      res.json(groupInfo);
      return;
    } else if (myMembership.rows[0].kind <= Membership.Invited) {
      // Not a member (yet) but have a member kind.
      groupInfo.memberKind = myMembership.rows[0].kind;
      res.json(groupInfo);
      return;
    } else {
      // Either a regular member or admin.
      groupInfo.memberKind = myMembership.rows[0].kind;
    }

    // Get the member list for the group.
    const members = await client.query<GroupMember>(
      `
      SELECT users.id, users.name, users.username, groupmems.kind
      FROM groupmems
      INNER JOIN users ON groupmems.uid = users.id
      WHERE groupmems.gid = $1
      `,
      [gid]
    );
    groupInfo.members = members.rows;

    const unreadMessages = await client.query<{ count: number }>(
      `
      SELECT count(*), group_messages.gid_to AS gid
      FROM group_messages
      LEFT JOIN group_messages_read ON group_messages.id = group_messages_read.mid
        AND group_messages_read.uid = $1
      WHERE group_messages.uid_from != $1 AND group_messages_read.uid IS NULL
        AND group_messages.gid_to = $2
      GROUP BY group_messages.gid_to
      `,
      [myUid, gid]
    );
    if (unreadMessages.rowCount) {
      groupInfo.unreadMessages = unreadMessages.rows[0].count;
    }
    res.json(groupInfo);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function inviteToGroup(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const gid = validateNumeric(req.params.gid);
    const invitedUids = validateArrayEach(req.body.uids, validateNumeric);
    if (!invitedUids.length) {
      throw new StatusError(400, 'Missing uid(s)');
    }

    client = await getPool().connect();

    const loggedInUid = await getUserId(client, session);

    // Make sure I am a member of the group or the group is public.
    let memberInfo = await client.query<{ kind: Membership, public: boolean }>(
      `
      SELECT groupmems.kind, groups.public
      FROM groupmems
      RIGHT JOIN groups ON groupmems.gid = groups.id AND groupmems.uid = $1
      WHERE groups.id = $2
      `,
      [loggedInUid, gid]
    );
    if (memberInfo.rowCount === 0) {
      res.status(404);
      return;
    }
    if (!memberInfo.rows[0].public && memberInfo.rows[0].kind === null) {
      res.status(403);
      return;
    }

    // Insert the users into the group's members with invited status unless the
    // user is already in the group, then do nothing.
    const updatedUids = await client.query<{ uid: string }>(
      `
      INSERT INTO groupmems
      (uid, gid, kind)
      VALUES (unnest($1::bigint array), $2, 0)
      ON CONFLICT (uid, gid) DO NOTHING
      RETURNING uid
      `,
      [invitedUids, gid]
    );

    const invitedMsg = {
      m: 'group_membership_changed',
      id: gid,
      kind: Membership.Invited,
    };
    for (let row of updatedUids.rows) {
      const uid = row.uid;
      wsclients.getSender(uid).sendJson(invitedMsg);
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function makeGroupAdmin(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const gid = validateNumeric(req.params.gid);
    const requestedUid = validateNumeric(req.body.uid);

    client = await getPool().connect();

    const loggedInUid = getUserId(client, session);

    // Make sure I am an admin of this group.
    const myMembership = await client.query<{ kind: Membership }>(
      `SELECT kind FROM groupmems WHERE uid = $1 AND gid = $2`,
      [loggedInUid, gid]
    );
    if (myMembership.rowCount === 0 || myMembership.rows[0].kind !== Membership.Admin) {
      res.status(403);
      return;
    }

    // Give the requested user admin status.
    const userUpdate = await client.query<never>(
      `
      INSERT INTO groupmems
      (uid, gid, kind)
      VALUES ($1, $2, 2)
      ON CONFLICT (uid, gid) DO UPDATE SET kind = 2
      `,
      [requestedUid, gid]
    );
    if (userUpdate.rowCount === 0) {
      res.status(400);
      return;
    }
    wsclients.getSender(requestedUid).sendJson({
      m: 'group_membership_changed',
      id: gid,
      kind: Membership.Admin,
    });
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function joinGroup(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const gid = validateNumeric(req.params.gid);

    client = await getPool().connect();

    const uid = await getUserId(client, session);

    // Make sure I am invited to the group or the group is public.
    let myMembership = await client.query<{ kind: Membership, public: boolean }>(
      `
      SELECT groupmems.kind, groups.public
      FROM groupmems
      RIGHT JOIN groups ON groupmems.gid = groups.id AND groupmems.uid = $1
      WHERE groups.id = $2
      `,
      [uid, gid]
    );
    if (myMembership.rowCount === 0) {
      res.status(404);
      return;
    }
    if (myMembership.rows[0].kind !== null && myMembership.rows[0].kind > 0) {
      // I am already a member.
      res.status(400);
      return;
    }
    if (!myMembership.rows[0].public && myMembership.rows[0].kind !== 0) {
      // The group is not public and I have not been invited. Insert a
      // requested status.
      await client.query(
        `
        INSERT INTO groupmems
        (uid, gid, kind)
        VALUES ($1, $2, -1)
        ON CONFLICT (uid, gid) DO NOTHING
        `,
        [uid, gid]
      );
      res.write('requested');
    } else {
      // Change my invite status to member.
      await client.query(
        `
        INSERT INTO groupmems
        (uid, gid, kind)
        VALUES ($1, $2, 1)
        ON CONFLICT (uid, gid) DO UPDATE SET kind = 1`,
        [uid, gid]
      );
      res.write('joined');
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function getGroupRequests(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const gid = validateNumeric(req.params.gid);

    client = await getPool().connect();

    // Make sure I am an admin of this group.
    const memberKind = await client.query<{ kind: Membership }>(
      `
      SELECT kind FROM groupmems
      WHERE (uid, gid) = ((SELECT uid FROM sessions WHERE sesskey = $1), $2)
      `,
      [session, gid]
    );
    if (memberKind.rowCount === 0 || memberKind.rows[0].kind !== Membership.Admin) {
      res.status(403);
      return;
    }

    // Get users who have a member status of -1 (Requested).
    const requestedUsers = await getPool().query<{ id: string; name: string }>(
      `
      SELECT users.id, users.name
      FROM groupmems
      INNER JOIN users ON groupmems.uid = users.id
      WHERE groupmems.gid = $1 AND groupmems.kind = -1
      `,
      [gid]
    );
    res.json(requestedUsers.rows);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function approveGroupRequest(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const gid = validateNumeric(req.params.gid);
    const uid = validateNumeric(req.body.uid);

    client = await getPool().connect();

    // Make sure I am an admin of this group.
    let myMembership = await client.query<{ kind: Membership }>(
      `
      SELECT kind FROM groupmems
      WHERE (uid, gid) = ((SELECT uid FROM sessions WHERE sesskey = $1), $2)
      `,
      [session, gid]
    );
    if (myMembership.rowCount === 0 || myMembership.rows[0].kind !== Membership.Admin) {
      res.status(403);
      return;
    }

    await client.query(
      `UPDATE groupmems SET kind = 1 WHERE (uid, gid, kind) = ($1, $2, -1)`,
      [uid, gid]
    );
  } catch (e) {
    handleError(e, res, 400);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function denyGroupRequest(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const gid = validateNumeric(req.params.gid);
    const uid = validateNumeric(req.body.uid);

    client = await getPool().connect();

    // Make sure I am an admin of this group.
    let myMembership = await client.query<{ kind: Membership }>(
      `
      SELECT kind FROM groupmems
      WHERE (uid, gid) = ((SELECT uid FROM sessions WHERE sesskey = $1), $2)
      `,
      [session, gid]
    );
    if (myMembership.rowCount === 0 || myMembership.rows[0].kind !== Membership.Admin) {
      res.status(403);
      return;
    }

    await client.query(
      `DELETE FROM groupmems WHERE (uid, gid, kind) = ($1, $2, -1)`,
      [uid, gid]
    );
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function leaveGroup(req: Request, res: Response) {
  try {
    const session = validateUuid(req.cookies.session, 401);
    const gid = validateNumeric(req.params.gid);

    const deleteResult = await getPool().query<never>(
      `
      DELETE FROM groupmems
      WHERE uid = (SELECT uid FROM sessions WHERE sesskey = $1)
        AND gid = $2
      `,
      [session, gid]
    );
    if (deleteResult.rowCount === 0) {
      res.status(400);
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    res.end();
  }
}

export async function newGroup(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const name = validateMinMaxLength(req.body.name, 1, 255);
    const isPublic = validateBoolean(req.body.public);
    const invited = validateArrayEach(req.body.invited || [], validateNumeric);

    client = await getPool().connect();

    const myUid = await getUserId(client, session);

    let newGroupResult = await client.query<{ id: string }>(
      `INSERT INTO groups (name, public) VALUES ($1, $2) RETURNING id`,
      [name, isPublic]
    );
    const gid = newGroupResult.rows[0].id;

    await client.query(
      `INSERT INTO groupmems (uid, gid, kind) VALUES ($1, $2, 2)`,
      [myUid, gid]
    );
    if (invited) {
      await client.query(
        `
        INSERT INTO groupmems (uid, gid, kind)
        VALUES (unnest($1::bigint array), $2, 0)
        `,
        [invited, gid]
      );
    }

    invited.push(myUid);
    const memberResult = await client.query<Omit<GroupMember, 'kind'>>(
      `SELECT id, name, username FROM users WHERE id = ANY($1::bigint array)`,
      [invited]
    );
    res.json({
      id: gid,
      name,
      public: isPublic,
      memberKind: Membership.Admin,
      members: memberResult.rows.map(row => ({ kind: Membership.Invited, ...row })),
    });
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function deleteGroup(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const gid = validateNumeric(req.params.gid);

    client = await getPool().connect();

    // Make sure I am an admin of this group.
    let myMembership = await client.query<{ kind: Membership }>(
      `
      SELECT kind FROM groupmems
      WHERE (uid, gid) = ((SELECT uid FROM sessions WHERE sesskey = $1), $2)
      `,
      [session, gid]
    );
    if (myMembership.rowCount === 0 || myMembership.rows[0].kind !== Membership.Admin) {
      res.status(403);
      return;
    }

    // Delete the group.
    const deleteResult = await client.query(
      `DELETE FROM groups WHERE id = $1`,
      [gid]
    );
    if (deleteResult.rowCount === 0) {
      res.status(500);
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

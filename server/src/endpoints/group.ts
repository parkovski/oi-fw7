import type { Request, Response } from 'express';
import { getPool } from '../util/db.js';
import wsclients from '../server/wsclients.js';
import { handleError, StatusError } from '../util/error.js';
import {
  validateUuid, validateNumeric, validateArrayEach, validateMinMaxLength,
  validateBoolean,
} from '../util/validation.js';
import {
  Membership, UnreadMessage
} from 'oi-types/group';
import GroupModel from '../models/group.js';
import SessionModel from '../models/session.js';

export async function getGroups(req: Request, res: Response) {
  let client;
  try {
    const session = validateUuid(req.cookies.session, 401);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, session).getUserId();

    const [summary, unreadMessages, upcomingEvents] = await Promise.all([
      GroupModel.getGroupsForUser(client, myUid),
      GroupModel.getUnreadMessages(client, myUid),
      GroupModel.getUpcomingEvents(client, myUid),
    ]);

    const unreadMap = new Map<string, UnreadMessage>();
    unreadMessages.forEach(row => {
      unreadMap.set(row.gid, row);
    })
    summary.forEach(row => {
      row.unreadMessages = unreadMap.get(row.id)?.count;
    });

    unreadMap.clear();
    upcomingEvents.forEach(row => {
      unreadMap.set(row.gid, row);
    });
    summary.forEach(row => {
      row.upcomingEvents = unreadMap.get(row.id)?.count;
    });

    res.json(summary);
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

    const group = new GroupModel(client, gid);
    const groupInfo = await group.getBasicInfo();

    groupInfo.memberKind = null;

    if (!session) {
      res.json(groupInfo);
      return;
    }

    const myUid = await new SessionModel(client, session).getUserId();

    // Check that the logged in user is in the group before listing members.
    const myMembership = await group.getMembership(myUid);
    if (myMembership === null) {
      // Not a group member, so just reply with group name and public/private.
      // memberKind is already null here.
      res.json(groupInfo);
      return;
    } else if (myMembership <= Membership.Invited) {
      // Not a member (yet) but have a member kind.
      groupInfo.memberKind = myMembership;
      res.json(groupInfo);
      return;
    } else {
      // Either a regular member or admin.
      groupInfo.memberKind = myMembership;
    }

    // Get the member list and unread messages for the group.
    const [members, unreadMessages] = await Promise.all([
      group.getMembers(),
      group.getUnreadMessageCount(myUid)
    ]);
    groupInfo.members = members;
    groupInfo.unreadMessages = unreadMessages;

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
    const gid = validateNumeric(req.params.gid);
    const invitedUids = validateArrayEach(req.body.uids, validateNumeric);
    if (!invitedUids.length) {
      throw new StatusError(400, 'Missing uid(s)');
    }

    client = await getPool().connect();

    const loggedInUid = await new SessionModel(client, req.cookies.session).getUserId();

    // Make sure I am a member of the group or the group is public.
    const group = new GroupModel(client, gid);
    const memberInfo = await group.getMembershipAndPublic(loggedInUid);
    if (!memberInfo.public && memberInfo.kind === null) {
      res.status(403);
      return;
    }

    // Insert the users into the group's members with invited status unless the
    // user is already in the group, then do nothing.
    const updatedUids = await group.inviteUsers(invitedUids);
    const invitedMsg = {
      m: 'group_membership_changed',
      id: gid,
      kind: Membership.Invited,
    };
    wsclients.sendWs(updatedUids, invitedMsg);
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

    const loggedInUid = await new SessionModel(client, session).getUserId();

    // Make sure I am an admin of this group.
    const group = new GroupModel(client, gid);
    const myMembership = await group.getMembership(loggedInUid);
    if (myMembership !== Membership.Admin) {
      res.status(403);
      return;
    }

    // Give the requested user admin status.
    if (!await group.makeAdmin(requestedUid)) {
      throw new StatusError(404, 'Group membership not found');
    }
    wsclients.sendWs(requestedUid, {
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
    const gid = validateNumeric(req.params.gid);

    client = await getPool().connect();

    const uid = await new SessionModel(client, req.cookies.session).getUserId();

    // Make sure I am invited to the group or the group is public.
    const group = new GroupModel(client, gid);
    const myMembership = await group.getMembershipAndPublic(uid);
    if (myMembership.kind !== null && myMembership.kind > Membership.Invited) {
      // I am already a member.
      res.status(400);
      return;
    }
    if (!myMembership.public && myMembership.kind !== Membership.Invited) {
      // The group is not public and I have not been invited. Insert a
      // requested status.
      await group.requestToJoin(uid);
      res.write('requested');
    } else {
      // Change my invite status to member.
      await group.joinGroup(uid);
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
    const gid = validateNumeric(req.params.gid);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();

    // Make sure I am an admin of this group.
    const group = new GroupModel(client, gid);
    const memberKind = await group.getMembership(myUid);
    if (memberKind !== Membership.Admin) {
      res.status(403);
      return;
    }

    // Get users who have a member status of -1 (Requested).
    const requestedUsers = await group.getJoinRequests();
    res.json(requestedUsers);
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
    const gid = validateNumeric(req.params.gid);
    const uid = validateNumeric(req.body.uid);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();

    // Make sure I am an admin of this group.
    const group = new GroupModel(client, gid);
    const myMembership = await group.getMembership(myUid);
    if (myMembership !== Membership.Admin) {
      res.status(403);
      return;
    }

    await group.approveJoinRequest(uid);
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
    const gid = validateNumeric(req.params.gid);
    const uid = validateNumeric(req.body.uid);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();

    // Make sure I am an admin of this group.
    const group = new GroupModel(client, gid);
    const myMembership = await group.getMembership(myUid);
    if (myMembership !== Membership.Admin) {
      res.status(403);
      return;
    }

    await group.rejectJoinRequest(uid);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function leaveGroup(req: Request, res: Response) {
  let client;

  try {
    const gid = validateNumeric(req.params.gid);

    client = await getPool().connect();

    const uid = await new SessionModel(client, req.cookies.session).getUserId();

    const group = new GroupModel(client, gid);
    await group.leaveGroup(uid);
  } catch (e) {
    handleError(e, res);
  } finally {
    res.end();
    client && client.release();
  }
}

export async function newGroup(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const name = validateMinMaxLength(req.body.name, 1, 255);
    const description: string | null =
      req.body.description && validateMinMaxLength(req.body.description, 1, 1000) || null;
    const isPublic = validateBoolean(req.body.public);
    const invited = validateArrayEach(req.body.invited || [], validateNumeric);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, session).getUserId();

    const gid = await GroupModel.newGroup(client, name, isPublic, description);
    const group = new GroupModel(client, gid);

    await group.makeAdmin(myUid);
    if (invited.length) {
      await group.inviteUsers(invited);
    }

    invited.push(myUid);
    const members = await group.getMembers();
    res.json({
      id: gid,
      name,
      public: isPublic,
      memberKind: Membership.Admin,
      members,
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
    const gid = validateNumeric(req.params.gid);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();

    // Make sure I am an admin of this group.
    const group = new GroupModel(client,gid);
    const myMembership = await group.getMembership(myUid);
    if (myMembership !== Membership.Admin) {
      res.status(403);
      return;
    }

    // Delete the group.
    await group.deleteGroup();
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

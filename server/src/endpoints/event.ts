import type { Request, Response } from 'express';
import { getPool } from '../util/db.js';
import type { UploadedFile } from 'express-fileupload';
import { handleError, StatusError } from '../util/error.js';
import {
  validateNumeric, validateMinMaxLength, validateFutureDate, validateBoolean,
  validateArrayEach, validateMaybeNegative,
} from '../util/validation.js';
import wsclients from '../server/wsclients.js';
import { AttendanceKind } from 'oi-types/event';
import {
  EventAddedMessage, EventAttendanceChangedMessage, EventRespondedMessage,
} from 'oi-types/message';
import { Membership } from 'oi-types/group';
import EventModel from '../models/event.js';
import SessionModel from '../models/session.js';
import PhotoModel from '../models/photo.js';
import GroupModel from '../models/group.js';
import UserModel from '../models/user.js';
import SettingsModel from '../models/settings.js';

export async function getEvents(req: Request, res: Response) {
  let client;

  try {
    client = await getPool().connect();

    const uid = await new SessionModel(client, req.cookies.session).getUserId();
    const events = await new EventModel(client).getUserSummary(uid);
    res.json(events);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function getEventInfo(req: Request, res: Response) {
  let client;

  try {
    const session = req.cookies.session;
    const eid = validateNumeric(req.params.eid);

    client = await getPool().connect();

    const event = new EventModel(client);
    const eventInfo = await event.getEvent(eid);
    eventInfo.kind = null;

    if (!session) {
      res.json(eventInfo);
      return;
    }

    const uid = await new SessionModel(client, session).getUserId();

    // Check that I am invited to the event before listing invitees.
    const attendance = await event.getAttendance(uid, eid);
    if (attendance === null) {
      // I'm not in the attendance list. Check if the event is for a group that I am in.
      const membership = await event.getGroupMembership(uid, eid);
      if (membership === null || membership < Membership.Member) {
        res.json(eventInfo);
        return;
      }
    } else {
      eventInfo.kind = attendance;
    }

    // Get the invite list
    const members = await event.getInviteList(eid);
    if (members.length) {
      eventInfo.members = members;
    }

    // Get the comments list
    const comments = await event.getCommentsList(eid);
    if (comments.length) {
      eventInfo.comments = comments;
    }

    // Get the photos list
    const photos = await event.getPhotos(eid);
    if (photos.length) {
      eventInfo.photos = photos;
    }

    res.json(eventInfo);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function getGroupEvents(req: Request, res: Response) {
  let client;

  try {
    const gid = validateNumeric(req.params.gid);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();
    const membership = await new GroupModel(client).getMembership(myUid, gid);
    if (membership === null || membership < Membership.Member) {
      res.status(403);
      return;
    }

    const events = await new EventModel(client).getGroupEvents(myUid, gid);
    res.json(events);
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
    const eid = validateNumeric(req.params.eid);
    const text = validateMinMaxLength(req.body.text, 1, 2000);

    client = await getPool().connect();

    const uid = await new SessionModel(client, req.cookies.session).getUserId();
    const messageId = await new EventModel(client).insertComment(eid, uid, text);
    res.write(messageId);
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
    const eid = validateNumeric(req.params.eid);
    const kind = +validateMaybeNegative(req.body.kind);
    switch (kind) {
    case -1: case 1: case 2: break;
    default: throw new StatusError('Invalid attendance kind');
    }

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();

    // Update attendance only if not hosting.
    const event = new EventModel(client);
    if (!await event.setAttendance(myUid, eid, kind)) {
      res.status(404);
    } else {
      wsclients.sendWs<EventAttendanceChangedMessage>(myUid, {
        m: 'event_attendance_changed',
        id: eid,
        kind,
      });
      res.write('' + kind);

      const [myUsername, hosts, title, wantsNotification] = await Promise.all([
        new UserModel(client).getUsername(myUid),
        event.getHosts(eid),
        event.getTitle(eid),
        new SettingsModel(client).getNotificationSetting(myUid, 'event_responded'),
      ]);
      // Notify the hosts.
      const message: EventRespondedMessage = {
        m: 'event_responded',
        id: eid,
        name: myUsername,
        kind,
        title: title,
      };
      wsclients.sendWsAndPush(hosts, message, wantsNotification);
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
    const eid = validateNumeric(req.params.eid);
    const invitedUids = validateArrayEach(req.body.uids, validateNumeric);
    if (!invitedUids.length) {
      throw new StatusError(400, 'Missing uid(s)');
    }

    client = await getPool().connect();

    const loggedInUid = await new SessionModel(client, req.cookies.session).getUserId();

    // Make sure I am in the event's member list
    const event = new EventModel(client);
    const attendanceInfo = await event.getAttendanceInfo(loggedInUid, eid);
    if (!attendanceInfo.public && attendanceInfo.kind === null) {
      res.status(403);
      return;
    }

    const inserted = await event.inviteUsers(eid, invitedUids);

    const wantsNotification = await new SettingsModel(client).getNotificationSettingForMany(
      inserted, 'event_added'
    );

    const msg: EventAddedMessage = {
      m: 'event_added',
      id: eid,
      title: attendanceInfo.title
    }
    for (let i = 0; i < inserted.length; ++i) {
      wsclients.sendWsOrPush(inserted[i], msg, wantsNotification[i]);
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
    const eid = validateNumeric(req.params.eid);
    const invitedUids = validateArrayEach(req.body.uids, validateNumeric);
    if (!invitedUids.length) {
      throw new StatusError(400, 'Missing uid(s)');
    }

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();

    // Make sure I am a host first.
    const event = new EventModel(client);
    const myAttendance = await event.getAttendance(myUid, eid);
    if (myAttendance !== AttendanceKind.Hosting) {
      throw new StatusError(403);
    }

    // Only invite users that are marked as attending.
    const attending = await event.getAttendingUsers(eid, invitedUids);
    const toInvite = [];
    for (const user of attending) {
      if (user.kind === AttendanceKind.Attending) {
        toInvite.push(user.uid);
      }
    }

    if (toInvite.length) {
      const [_, title, wantsNotification] = await Promise.all([
        event.convertToHosts(eid, toInvite),
        event.getTitle(eid),
        new SettingsModel(client).getNotificationSettingForMany(
          toInvite, 'event_attendance_changed')
      ]);
      const message: EventAttendanceChangedMessage = {
        m: 'event_attendance_changed',
        id: eid,
        kind: AttendanceKind.Hosting,
        title,
      };
      toInvite.forEach((uid, index) =>
        wsclients.sendWsAndPush(uid, message, wantsNotification[index]));
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
    const title: string = validateMinMaxLength(req.body.title?.trim(), 1, 255);
    const description: string | null = req.body.description?.trim() || null;
    const place: string | null = req.body.place?.trim() || null;
    const startTime = validateFutureDate(req.body.startTime);
    const endTime = validateFutureDate(req.body.endTime);
    const isPublic: boolean = validateBoolean(req.body.public);
    const invited = validateArrayEach(req.body.invited || [], validateNumeric);
    const coverPhoto = req.files?.coverPhoto as UploadedFile | undefined;
    const gid: string | null = req.body.groupId || null;

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

    const uid = await new SessionModel(client, req.cookies.session).getUserId();

    let coverPhotoFilename = null;
    if (coverPhoto) {
      const photo = new PhotoModel(coverPhoto);
      const { filename } = await photo.upload({
        allowedExtensions: ['.png', '.jpg', '.jpeg']
      });
      coverPhotoFilename = filename;
    }

    const event = new EventModel(client);
    const eid = await event.newEvent(
      title, description, uid, place, startTime, endTime, isPublic, coverPhotoFilename, gid
    );

    // Add myself as a host (kind 3).
    await event.addHost(eid, uid);

    const eventAddedMessage: EventAddedMessage = {
      m: 'event_added',
      id: eid,
      title,
    };
    wsclients.sendWs(uid, eventAddedMessage);

    if (!gid && invited.length) {
      const realInvited = await event.inviteUsers(eid, invited);
      const wantsPush = await new SettingsModel(client).getNotificationSettingForMany(
        realInvited, 'event_added'
      );
      for (let i = 0; i < realInvited.length; ++i) {
        wsclients.sendWsAndPush(realInvited[i], eventAddedMessage, wantsPush[i]);
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

export async function uploadEventPhoto(req: Request, res: Response) {
  let client;

  try {
    const eid = req.params.eid;
    const file = req.files?.photo as UploadedFile | undefined;
    if (!file) {
      return;
    }

    client = await getPool().connect();

    const uid = await new SessionModel(client, req.cookies.session).getUserId();

    const photo = new PhotoModel(file);
    const { filename } = await photo.upload({
      allowedExtensions: ['.png', '.jpg', '.jpeg'],
    });

    const thumbnail = await PhotoModel.createThumbnail(`${process.env.UPLOAD_DIR}/${filename}`);

    await new EventModel(client).addPhoto(eid, uid, filename, thumbnail);

    res.json({ url: filename, thumbnail });
  } catch (e) {
    handleError(e, res);
  } finally {
    res.end();
    client && client.release();
  }
}

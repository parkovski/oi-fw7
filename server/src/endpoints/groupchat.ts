import type { WebSocket } from 'ws';
import type { Request, Response } from 'express';
import clients from '../server/wsclients.js';
import { getPool } from '../util/db.js';
import escapeHtml from '../util/escapehtml.js';
import { handleError, StatusError } from '../util/error.js';
import {
  validateUuid, validateNumeric, validateMinMaxLength, validateArrayEach,
} from '../util/validation.js';
import { Membership } from 'oi-types/group';
import {
  ClientGroupMessage, ServerGroupMessage, GroupMessageSentMessage,
  GroupMessageReceivedMessage,
} from 'oi-types/message';
import GroupModel from '../models/group.js';
import UserModel from '../models/user.js';
import SessionModel from '../models/session.js';

export async function groupChatListen(this: WebSocket, msg: ClientGroupMessage) {
  let client;

  try {
    const uid = clients.getUid(this)!;
    validateNumeric(msg.to);
    validateUuid(msg.uuid);
    validateMinMaxLength(msg.text, 1, 2000);
    msg.text = escapeHtml(msg.text);

    client = await getPool().connect();

    // Check that I am a member of the group.
    const group = new GroupModel(client, msg.to);
    const membership = await group.getMembership(uid);
    if (membership === null || membership <= Membership.Invited) {
      return;
    }

    const insertResult = await group.insertMessage(uid, msg.text);
    this.send(JSON.stringify({
      m: 'group_message_sent',
      uuid: msg.uuid,
      id: insertResult.id,
      time: insertResult.sent,
      text: msg.text,
    } satisfies GroupMessageSentMessage));

    const { name, username } = await new UserModel(client, uid).getNameAndUsername();
    const members = await group.getMemberUids();
    const groupmsg: ServerGroupMessage = {
      m: 'groupchat',
      id: insertResult.id,
      from: uid,
      fromName: name,
      fromUsername: username,
      to: msg.to,
      time: insertResult.sent,
      text: msg.text,
    };
    clients.sendWs(members, groupmsg);
  } catch {
    // Ignore
  } finally {
    client && client.release();
  }
}

export async function groupMessageReceived(this: WebSocket, msg: GroupMessageReceivedMessage) {
  let client;

  try {
    const uid = clients.getUid(this)!;
    if (Array.isArray(msg.id)) {
      validateArrayEach(msg.id, validateNumeric);
    } else {
      validateNumeric(msg.id);
    }

    client = await getPool().connect();

    await GroupModel.markRead(client, msg.id, uid);
  } catch {
    // Ignore
  } finally {
    client && client.release();
  }
}

export async function getGroupChat(req: Request, res: Response) {
  let client;

  try {
    const gid = validateNumeric(req.params.gid);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();

    // Check that I am a member of the group.
    const group = new GroupModel(client, gid);
    const membership = await group.getMembership(myUid);
    if (membership === null || membership <= Membership.Invited) {
      throw new StatusError(403);
    }

    const messages = await group.getInitialMessages(myUid);
    res.json(messages);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

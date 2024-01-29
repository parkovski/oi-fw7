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
import GroupChatModel from '../models/groupchat.js';
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
    const group = new GroupModel(client);
    const membership = await group.getMembership(uid, msg.to);
    if (membership === null || membership <= Membership.Invited) {
      return;
    }

    const groupChat = new GroupChatModel(client);
    const insertResult = await groupChat.insertMessage(uid, msg.to, msg.text);
    this.send(JSON.stringify({
      m: 'group_message_sent',
      uuid: msg.uuid,
      id: insertResult.id,
      time: insertResult.sent,
      text: msg.text,
    } satisfies GroupMessageSentMessage));

    const { name, username } = await new UserModel(client).getNameAndUsername(uid);
    const members = await group.getMemberUids(msg.to);
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

    await new GroupChatModel(client).markRead(msg.id, uid);
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
    const membership = await new GroupModel(client).getMembership(myUid, gid);
    if (membership === null || membership <= Membership.Invited) {
      throw new StatusError(403);
    }

    const messages = await new GroupChatModel(client).getInitialMessages(myUid, gid);
    res.json(messages);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

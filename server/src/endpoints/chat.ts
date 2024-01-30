import type { WebSocket } from 'ws';
import type { Request, Response } from 'express';
import clients from '../server/wsclients.js';
import { getPool } from '../util/db.js';
import escapeHtml from '../util/escapehtml.js';
import { handleError } from '../util/error.js';
import {
  validateUuid, validateNumeric, validateMinMaxLength, validateArrayEach,
} from '../util/validation.js';
import { ContactKind } from 'oi-types/user';
import { UnreadMessageSummary } from 'oi-types/chat';
import {
  ClientChatMessage, ServerChatMessage, MessageSentMessage,
  MessageReceivedMessage,
} from 'oi-types/message';
import ChatModel from '../models/chat.js';
import SessionModel from '../models/session.js';

export async function chatListen(this: WebSocket, msg: ClientChatMessage) {
  let client;

  try {
    const uid = clients.getUid(this)!;

    validateUuid(msg.uuid);
    validateNumeric(msg.to);
    validateMinMaxLength(msg.text, 1, 2000);

    client = await getPool().connect();

    msg.text = escapeHtml(msg.text);

    const chat = new ChatModel(client, uid);
    // Make sure the recipient is an approved contact.
    const contactKind = await chat.getContactKind(msg.to);
    if (contactKind === null || contactKind === ContactKind.Requested) {
      return;
    }

    const row = await chat.insertMessage(msg.to, msg.text);
    clients.sendWs<MessageSentMessage>(uid, {
      m: 'message_sent',
      uuid: msg.uuid,
      id: row.id,
      time: row.sent,
      text: row.message,
    });

    const nameAndNotification = await chat.getNameAndChatNotification();
    const message: ServerChatMessage = {
      m: 'chat',
      id: row.id,
      from: uid,
      fromName: nameAndNotification.name,
      fromUsername: nameAndNotification.username,
      time: row.sent,
      text: msg.text,
    };
    clients.sendWsOrPush(msg.to, message, nameAndNotification.chat);
  } catch {
    // Ignore
  } finally {
    client && client.release();
  }
}

export async function chatMessageReceived(this: WebSocket, msg: MessageReceivedMessage) {
  let client;

  try {
    client = await getPool().connect();

    if (Array.isArray(msg.id)) {
      validateArrayEach(msg.id, validateNumeric);
    } else {
      validateNumeric(msg.id);
    }

    ChatModel.updateChatReceived(client, msg.id);
  } catch {
  } finally {
    client && client.release();
  }
}

export async function getUserChat(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const uid = validateNumeric(req.params.uid);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, session).getUserId();
    const messages = await new ChatModel(client, myUid).getMessagesInitial(uid);
    res.json(messages.reverse());
  } catch (e) {
    handleError(e, res, 400);
  } finally {
    res.end();
    client && client.release();
  }
}

export async function getUserChatSummary(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);

    client = await getPool().connect();

    const uid = await new SessionModel(client, session).getUserId();
    const chat = new ChatModel(client, uid);
    const summary = await chat.getSummary();
    const unread = await chat.getUnreadMessageCount();

    const unreadMap = new Map<string, UnreadMessageSummary>();
    unread.forEach(row => unreadMap.set(row.uid, row));
    summary.forEach(row => row.unread = unreadMap.get(row.uid)?.count);

    res.json(summary);
  } catch (e) {
    handleError(e, res, 400);
  } finally {
    res.end();
    client && client.release();
  }
}

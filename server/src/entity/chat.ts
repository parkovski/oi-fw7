import type { WebSocket } from 'ws';
import type { Request, Response } from 'express';
import clients from '../server/wsclients.js';
import { getPool, getUserId } from '../util/db.js';
import escapeHtml from '../util/escapehtml.js';
import { handleError } from '../util/error.js';
import {
  validateUuid, validateNumeric, validateMinMaxLength, validateArrayEach,
} from '../util/validation.js';
import { ContactKind } from 'oi-types/user';
import {
  ClientChatMessage, ServerChatMessage, MessageSentMessage,
  MessageReceivedMessage, ChatSummary,
} from 'oi-types/chat';

// Returned from http method getUserChat. TODO: Unify this w/ above.
interface OutgoingChatMessage2 {
  id: string;
  uid_from: string;
  uid_to: string;
  message: string;
  sent: string; // Date???
  name_from: string;
}

interface UnreadMessageSummary {
  count: number;
  uid: string;
}

export async function chatListen(this: WebSocket, msg: ClientChatMessage) {
  let client;

  try {
    const uid = clients.getUid(this)!;

    validateUuid(msg.uuid);
    validateNumeric(msg.to);
    validateMinMaxLength(msg.text, 1, 2000);

    client = await getPool().connect();

    msg.text = escapeHtml(msg.text);

    // Make sure the recipient is an approved contact.
    const contactResult = await client.query<{ kind: ContactKind }>(
      `SELECT kind FROM contacts WHERE (uid_owner, uid_contact) = ($1, $2)`,
      [uid, msg.to]
    );
    if (contactResult.rowCount === 0 || contactResult.rows[0].kind === ContactKind.Requested) {
      return;
    }

    const messageResult = await client.query<{ id: string; sent: string; message: string }>(
      `
      INSERT INTO user_messages
      (uid_from, uid_to, message)
      VALUES ($1, $2, $3)
      RETURNING id, sent, message
      `,
      [uid, msg.to, msg.text]
    );
    const row = messageResult.rows[0];
    const mySessions = clients.getSender(uid);
    mySessions.sendJson<MessageSentMessage>({
      m: 'message_sent',
      uuid: msg.uuid,
      id: row.id,
      time: row.sent,
      text: row.message,
    });

    const nameResult = await client.query<{ name: string }>(
      `SELECT name FROM users WHERE id = $1`,
      [uid]
    );
    const yourSessions = clients.getSender(msg.to);
    yourSessions.sendJson<ServerChatMessage>({
      m: 'chat',
      id: row.id,
      from: uid,
      fromName: nameResult.rows[0].name,
      time: row.sent,
      text: msg.text,
    });
  } catch {
    // Ignore
  } finally {
    client && client.release();
  }
}

export async function chatMessageReceived(this: WebSocket, msg: MessageReceivedMessage) {
  try {
    if (Array.isArray(msg.id)) {
      validateArrayEach(msg.id, validateNumeric);
      await getPool().query(
        `UPDATE user_messages SET received = NOW() WHERE id = ANY($1) AND received IS NULL`,
        [msg.id]
      );
    } else {
      validateNumeric(msg.id);
      await getPool().query(
        `UPDATE user_messages SET received = NOW() WHERE id = $1 AND received IS NULL`,
        [msg.id]
      );
    }
  } catch {
  } finally {
  }
}

export async function getUserChat(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const uid = validateNumeric(req.params.uid);

    client = await getPool().connect();

    const myUid = await getUserId(client, session);
    const messageResult = await client.query<OutgoingChatMessage2>(
      `
      SELECT user_messages.id, user_messages.uid_from, user_messages.uid_to,
        user_messages.message, user_messages.sent, user_messages.received,
        users.name as name_from
      FROM user_messages
      INNER JOIN users ON user_messages.uid_from = users.id
      WHERE (uid_from = $1 AND uid_to = $2) OR (uid_to = $1 AND uid_from = $2)
      ORDER BY id DESC
      LIMIT 50
      `,
      [uid, myUid]
    );
    res.json(messageResult.rows.reverse());
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

    const uid = await getUserId(client, session);
    const summaryResult = await client.query<ChatSummary>(
      `
      SELECT DISTINCT ON (user_messages.uid_from)
        user_messages.uid_from AS uid, users.name, users.username
      FROM user_messages
      INNER JOIN users ON user_messages.uid_from = users.id
      WHERE user_messages.uid_to = $1
      UNION
      SELECT DISTINCT ON (user_messages.uid_to)
        user_messages.uid_to AS uid, users.name, users.username
      FROM user_messages
      INNER JOIN users ON user_messages.uid_to = users.id
      WHERE user_messages.uid_from = $1
      `,
      [uid]
    );
    const unreadResult = await client.query<UnreadMessageSummary>(
      `
      SELECT count(*), uid_from AS uid
      FROM user_messages
      WHERE uid_to = $1 AND received IS NULL
      GROUP BY uid_from
      `,
      [uid]
    );
    const unread = new Map<string, UnreadMessageSummary>();
    unreadResult.rows.forEach(row => {
      unread.set(row.uid, row);
    });
    summaryResult.rows.forEach(row => {
      row.unread = unread.get(row.uid)?.count;
    });
    res.json(summaryResult.rows);
  } catch (e) {
    handleError(e, res, 400);
  } finally {
    res.end();
    client && client.release();
  }
}

import type { WebSocket } from 'ws';
import type { Request, Response } from 'express';
import clients from '../server/wsclients.js';
import { getPool, getUserId } from '../util/db.js';
import escapeHtml from '../util/escapehtml.js';
import { handleError } from '../util/error.js';
import {
  validateUuid, validateNumeric, validateMinMaxLength, validateArrayEach,
} from '../util/validation.js';
import { Membership, GroupChatSummary } from 'oi-types/group';
import {
  ClientGroupMessage, ServerGroupMessage, GroupMessageSentMessage,
  GroupMessageReceivedMessage,
} from 'oi-types/message';

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
    const membership = await client.query<{ kind: Membership }>(
      `SELECT groupmems.kind FROM groupmems WHERE (uid, gid) = ($1, $2)`,
      [uid, msg.to]
    );
    if (membership.rowCount === 0 || membership.rows[0].kind <= Membership.Invited) {
      return;
    }

    const insertResult = await client.query<{ id: string; sent: string; message: string }>(
      `
      INSERT INTO group_messages
      (uid_from, gid_to, message)
      VALUES ($1, $2, $3)
      RETURNING id, sent, message
      `,
      [uid, msg.to, msg.text]
    );
    const messageRow = insertResult.rows[0];
    this.send(JSON.stringify({
      m: 'group_message_sent',
      uuid: msg.uuid,
      id: messageRow.id,
      time: messageRow.sent,
      text: messageRow.message,
    } satisfies GroupMessageSentMessage));

    const nameResult = await client.query<{ name: string }>(
      `SELECT name FROM users WHERE id = $1`,
      [uid]
    );
    const fromName = nameResult.rows[0].name;

    const uidResult = await client.query<{ uid: string }>(
      `SELECT uid FROM groupmems WHERE gid = $1`,
      [msg.to]
    );
    const groupmsg: ServerGroupMessage = {
      m: 'groupchat',
      id: messageRow.id,
      from: uid,
      fromName,
      to: msg.to,
      time: messageRow.sent,
      text: msg.text,
    };
    uidResult.rows.forEach(row => {
      clients.getSender(row.uid).sendJson(groupmsg);
    })
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

    if (Array.isArray(msg.id)) {
      await client.query(
        `INSERT INTO group_messages_read(mid, uid) VALUES (unnest($1::bigint array), $2)`,
        [msg.id, uid]
      );
    } else {
      await client.query(
        `INSERT INTO group_messages_read(mid, uid) VALUES ($1, $2)`,
        [msg.id, uid]
      );
    }
  } catch {
    // Ignore
  } finally {
    client && client.release();
  }
}

export async function getGroupChat(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const gid = validateNumeric(req.params.gid);

    client = await getPool().connect();

    const myUid = await getUserId(client, session);

    // Check that I am a member of the group.
    const membershipResult = await client.query<{ kind: Membership }>(
      `SELECT kind FROM groupmems WHERE uid = $1 AND gid = $2`,
      [myUid, gid]
    );
    if (membershipResult.rowCount === 0 || membershipResult.rows[0].kind <= 0) {
      res.status(403);
      return;
    }

    const messageResult = await client.query<GroupChatSummary>(
      `
      SELECT group_messages.id, group_messages.uid_from, users.name,
        users.username, group_messages.message, group_messages.sent,
        group_messages_read.time AS received
      FROM group_messages
      INNER JOIN users ON group_messages.uid_from = users.id
      LEFT JOIN group_messages_read ON group_messages.id = group_messages_read.mid
        AND group_messages_read.uid = $1
      WHERE group_messages.gid_to = $2
      ORDER BY group_messages.id DESC
      LIMIT 50
      `,
      [myUid, gid]
    );
    res.json(messageResult.rows.reverse());
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

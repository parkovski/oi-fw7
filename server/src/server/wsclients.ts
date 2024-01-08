import type { WebSocket } from 'ws';
import type { Message } from './wsserver.js';
import { getPool } from '../util/db.js';
import webpush from 'web-push';

// HACK - Why is this type not public?
type BufferLike =
    | string
    | Buffer
    | DataView
    | number
    | ArrayBufferView
    | Uint8Array
    | ArrayBuffer
    | SharedArrayBuffer
    | readonly any[]
    | readonly number[]
    | { valueOf(): ArrayBuffer }
    | { valueOf(): SharedArrayBuffer }
    | { valueOf(): Uint8Array }
    | { valueOf(): readonly number[] }
    | { valueOf(): string }
    | { [Symbol.toPrimitive](hint: string): string };

export class ClientSender {
  _webSockets: WebSocket[] | undefined;
  static _emptySender = new ClientSender();

  constructor(webSockets?: WebSocket[] | undefined) {
    this._webSockets = webSockets;
  }

  send(message: BufferLike) {
    if (this._webSockets) {
      this._webSockets.forEach(ws => ws.send(message));
    }
  }

  sendJson<T extends Message>(message: T) {
    if (this._webSockets) {
      const json = JSON.stringify(message);
      this._webSockets.forEach(ws => ws.send(json));
    }
  }

  hasReceiver(): boolean {
    return this._webSockets !== undefined;
  }
}

export class PushSender {
  _uid: string;

  constructor(uid: string) {
    this._uid = uid;
  }

  async send(message: string) {
    let client;
    try {
      client = await getPool().connect();
      const q = await client.query(
        `SELECT push_endpoint, key_p256dh, key_auth FROM sessions WHERE uid = $1`,
        [this._uid]
      );
      await Promise.all(q.rows.map(row => {
        if (row.push_endpoint === null) {
          return Promise.resolve();
        }
        const subscription = {
          endpoint: row.push_endpoint,
          keys: {
            p256dh: row.key_p256dh,
            auth: row.key_auth,
          }
        };
        return webpush.sendNotification(subscription, message);
      }));
    } finally {
      client && client.release();
    }
  }

  sendJson<T extends Message>(message: T) {
    return this.send(JSON.stringify(message));
  }
}

export class ClientManager {
  uidToWs = new Map<string, WebSocket[]>;
  wsToUid = new Map<WebSocket, string>;

  add(ws: WebSocket, uid: string) {
    const wsArray = this.uidToWs.get(uid);
    if (!wsArray) {
      this.uidToWs.set(uid, [ws]);
    } else {
      wsArray.push(ws);
    }
    this.wsToUid.set(ws, uid);
  }

  delete(ws: WebSocket) {
    const uid = this.wsToUid.get(ws);
    if (uid === undefined) {
      return;
    }
    this.wsToUid.delete(ws);
    const wsArray = this.uidToWs.get(uid)!;
    if (wsArray.length === 1) {
      this.uidToWs.delete(uid);
    } else {
      this.uidToWs.set(uid, wsArray.filter(ws2 => ws !== ws2));
    }
  }

  getWebSockets(uid: string): WebSocket[] | undefined {
    return this.uidToWs.get(uid);
  }

  getSender(uid: string): ClientSender {
    const sockets = this.uidToWs.get(uid);
    if (!sockets) {
      return ClientSender._emptySender;
    }
    return new ClientSender(sockets);
  }

  getUid(ws: WebSocket): string | undefined {
    return this.wsToUid.get(ws);
  }
}

const clients = new ClientManager;
export default clients;

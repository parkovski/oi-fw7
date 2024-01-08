import cookie from 'cookie';
import { getPool, getUserId } from '../util/db.js';
import clients from './wsclients.js';
import { WebSocket } from 'ws';
import type { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'node:http';

export interface Message {
  m: string;
}

export type WebSocketListener<T extends Message | Buffer> = (this: WebSocket, message: T) => void;

const listeners = new Map<string, WebSocketListener<any>[]>;

export function listen(message: 'binary', listener: WebSocketListener<Buffer>): void;
export function listen<T extends Message>(message: string, listener: WebSocketListener<T>):void;
export function listen(message: string, listener: WebSocketListener<any>): void {
  let ls = listeners.get(message);
  if (!ls) {
    ls = [];
    listeners.set(message, ls);
  }
  ls.push(listener);
}

function onError(this: WebSocket, err: Error) {
  console.error(err);
}

function onClose(this: WebSocket) {
  clients.delete(this);
}

function onMessage(this: WebSocket, data: Buffer, isBinary: boolean) {
  if (isBinary) {
    const ls = listeners.get('binary');
    if (ls) {
      ls.forEach(l => l.call(this, data));
    }
  } else {
    try {
      const json = JSON.parse(data.toString());
      const message = json.m;
      if (typeof message !== 'string') {
        throw new Error('WebSocket message: missing \'m\' field');
      }
      const ls = listeners.get(message);
      if (ls) {
        ls.forEach(l => l.call(this, json));
      }
    } catch {
      // Ignore malformed messages
    }
  }
}

function onConnect(this: WebSocket, uid: string, _req: IncomingMessage) {
  clients.add(this, uid);
  this.send('{"m":"connect_ok"}');
}

async function setupWebSocket(ws: WebSocket, cookies: Record<string, string>, req: IncomingMessage) {
  let client;

  try {
    client = await getPool().connect();
    const uid = await getUserId(client, cookies.session);
    ws.on('error', onError);
    ws.on('close', onClose);
    ws.on('message', onMessage);
    if (ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
      onConnect.call(ws, uid, req);
    }
  } catch {
    ws.close(1002); // Protocol error
  } finally {
    client && client.release();
  }
}

export function onWebSocketConnected(this: WebSocketServer, ws: WebSocket, req: IncomingMessage) {
  if (req.headers.cookie) {
    const cookies = cookie.parse(req.headers.cookie);
    if (cookies.session) {
      setupWebSocket(ws, cookies, req);
    } else {
      ws.close(3001); // Not authorized
    }
  } else {
    ws.close(3001); // Not authorized
  }
}

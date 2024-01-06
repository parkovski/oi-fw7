import { Observable } from 'rxjs';
import type { Subscriber, TeardownLogic, Subscription } from 'rxjs';

export type SubscriberLike<T> = Subscriber<T> | ((msg: T) => TeardownLogic);

export interface Message {
  m: string;
}

interface MessageHandler<T extends Message | Blob | ArrayBuffer> {
  observable: Observable<T>;
  subscribers: Subscriber<T>[];
}

declare var process: any;

const webSocketUrl = 
  process.env.NODE_ENV === 'production'
    ? 'wss://api.oi.parkovski.com'
    : (window.location.hostname === 'localhost'
      ? 'ws://localhost:3000'
      : 'wss://api.oi.parkovski.com');

class WebSocketService {
  _webSocket: WebSocket;
  _handlers: Map<string, MessageHandler<any>> = new Map;
  _retries: number = 0;

  constructor() {
    this._webSocket = new WebSocket(webSocketUrl);
    this._webSocket.addEventListener('error', this._onError.bind(this));
    this._webSocket.addEventListener('close', this._onClose.bind(this));
    this._webSocket.addEventListener('open', this._onOpen.bind(this));
    this._webSocket.addEventListener('message', this._onMessage.bind(this));
  }

  reconnect() {
    ++this._retries;
    this._webSocket = new WebSocket(webSocketUrl);
    this._webSocket.addEventListener('error', this._onError.bind(this));
    this._webSocket.addEventListener('close', this._onClose.bind(this));
    this._webSocket.addEventListener('open', this._onOpen.bind(this));
    this._webSocket.addEventListener('message', this._onMessage.bind(this));
  }

  _onError(_event: Event) {
  }

  _onClose(_event: CloseEvent) {
    switch (this._retries) {
    case 0:
      this.reconnect();
      break;
    case 1:
      setTimeout(this.reconnect.bind(this), 1000);
      break;
    case 2:
      setTimeout(this.reconnect.bind(this), 3000);
      break;
    case 3:
      setTimeout(this.reconnect.bind(this), 5000);
      break;
    default:
      break;
    }
  }

  _onOpen(_event: Event) {
    this._retries = 0;
  }

  _onMessage(event: MessageEvent) {
    if (typeof event.data === 'string') {
      try {
        const json = JSON.parse(event.data);
        if (typeof json.m !== 'string') {
          throw new Error('WebSocket message missing \'m\' field');
        }
        const handler = this._handlers.get(json.m);
        if (handler) {
          handler.subscribers.forEach(s => s.next(json));
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      const handler = this._handlers.get('binary');
      if (handler) {
        handler.subscribers.forEach(s => s.next(event.data));
      }
    }
  }

  get readyState() {
    return this._webSocket.readyState;
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    this._webSocket.send(data);
  }

  json(data: object) {
    this._webSocket.send(JSON.stringify(data));
  }

  subscribe<T extends Message>(message: string, subscriber: SubscriberLike<T>): Subscription;
  subscribe(message: 'binary', subscriber: SubscriberLike<Blob>): Subscription;
  subscribe<T extends Message>(message: string, subscriber: SubscriberLike<T>) {
    let handler = this._handlers.get(message);
    if (!handler) {
      const subscribers: Subscriber<unknown>[] = [];
      handler = {
        observable: undefined as any,
        subscribers,
      };
      handler.observable = new Observable(subscriber => {
        handler!.subscribers.push(subscriber);
      });
      this._handlers.set(message, handler);
    }
    const subscription = handler.observable.subscribe(subscriber as SubscriberLike<unknown>);
    subscription.add(() => {
      handler!.subscribers = handler!.subscribers.filter(s => s !== subscriber);
    });
    return subscription;
  }
}

const service = new WebSocketService;
export default service;

import { Observable } from 'rxjs';
import type { Subscriber, TeardownLogic } from 'rxjs';

declare var process: any;

type SubscriberLike<T> = Subscriber<T> | ((msg: T) => TeardownLogic);

interface MessageHandler<T> {
  observable: Observable<T>;
  subscribers: Subscriber<T>[];
}

class WebSocketService {
  _webSocket: WebSocket;
  _handlers: Map<string, MessageHandler<unknown>> = new Map;

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      this._webSocket = new WebSocket('wss://api.oi.parkovski.com');
    } else {
      this._webSocket = new WebSocket('ws://localhost:3000');
    }
    this._webSocket.addEventListener('error', this._onError.bind(this));
    this._webSocket.addEventListener('close', this._onClose.bind(this));
    this._webSocket.addEventListener('open', this._onOpen.bind(this));
    this._webSocket.addEventListener('message', this._onMessage.bind(this));
  }

  _onError(_event: Event) {
    console.error('WebSocket error');
  }

  _onClose(_event: CloseEvent) {
    console.log('WebSocket closed');
  }

  _onOpen(_event: Event) {
    console.log('WebSocket opened');
  }

  _onMessage(event: MessageEvent) {
    if (typeof event.data === 'string') {
      try {
        const json = JSON.parse(event.data);
        if (typeof json.message !== 'string') {
          throw new Error('WebSocket message missing \'message\' field');
        }
        const handler = this._handlers.get(json.message);
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

  sendJson(data: object) {
    this._webSocket.send(JSON.stringify(data));
  }

  subscribe<T>(message: string, subscriber: SubscriberLike<T>) {
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
    const subscription = handler.observable.subscribe(subscriber as Subscriber<unknown>);
    subscription.add(() => {
      handler!.subscribers = handler!.subscribers.filter(s => s !== subscriber);
    });
    return subscription;
  }
}

const service = new WebSocketService;
export default service;

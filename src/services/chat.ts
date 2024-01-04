import Entity from './entity';
import webSocketService, { type SubscriberLike } from './websocket';
import { fetchJson } from '../js/fetch';

interface UserChatSummary {
  uid: string;
  name: string;
  username: string;
  unread?: number;
}

interface UserChatMessage {
  to: string;
  text: string;
}

interface OutgoingUserChatMessage extends UserChatMessage {
  m: 'chat';
  uuid: string;
}

interface IncomingUserChatMessage extends UserChatMessage {
  m: 'chat';
  from: string;
  fromName: string;
}

interface UserMessageSentMessage {
  m: 'message_sent';
  uuid: string;
  id: string;
  time: string;
}

interface MessageReceivedMessage {
  m: 'message_received';
  id: string | string[];
}

class ChatService {
  _chatSummary: Entity<UserChatSummary[]>;

  constructor() {
    this._chatSummary = new Entity(() => fetchJson('/chat'));

    this.messageReceived(msg => this._newMessage(msg));
  }

  _newMessage(msg: IncomingUserChatMessage) {
    if (!this._chatSummary.data) {
      this._chatSummary.refresh();
      return;
    }

    const index = this._chatSummary.data.findIndex(c => c.uid === msg.from);
    if (index === -1) {
      this._chatSummary.data.push({
        uid: msg.from,
        name: msg.fromName,
        username: 'undefined',
        unread: 1,
      });
    } else if (this._chatSummary.data[index].unread) {
      ++this._chatSummary.data[index].unread!;
    } else {
      this._chatSummary.data[index].unread = 1;
    }
    this._chatSummary.publish();
  }

  _markMessageRead(uid: string, count: number) {
    if (!this._chatSummary.data) {
      this._chatSummary.refresh();
      return;
    }

    const index = this._chatSummary.data.findIndex(c => c.uid === uid);
    if (index === -1) {
      this._chatSummary.refresh();
      return;
    }

    const summary = this._chatSummary.data[index];
    if (summary.unread !== undefined) {
      summary.unread -= count;
      this._chatSummary.publish();
    }
  }

  getChat(id: string) {
    return fetchJson(`/chat/${id}`);
  }

  getChatSummary() {
    return this._chatSummary;
  }

  messageSent(subscriber: SubscriberLike<UserMessageSentMessage>) {
    return webSocketService.subscribe<UserMessageSentMessage>('message_sent', subscriber);
  }

  messageReceived(subscriber: SubscriberLike<IncomingUserChatMessage>) {
    return webSocketService.subscribe<IncomingUserChatMessage>('chat', subscriber);
  }

  acknowledge(id: string | string[], uidFrom: string) {
    const msg: MessageReceivedMessage = {
      m: 'message_received',
      id,
    }
    webSocketService.sendJson(msg);

    this._markMessageRead(uidFrom, Array.isArray(id) ? id.length : 1);
  }

  send(msg: UserChatMessage) {
    const outgoingMsg: OutgoingUserChatMessage = {
      m: 'chat',
      uuid: crypto.randomUUID(),
      ...msg,
    };
    webSocketService.sendJson(outgoingMsg);
    return outgoingMsg;
  }
}

const service = new ChatService;
export default service;

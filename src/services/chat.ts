import { Observable } from 'rxjs';
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
  m: 'message_received',
  id: string | string[];
}

class ChatService {
  _chatSummary: Entity<UserChatSummary[]>;

  constructor() {
    this._chatSummary = new Entity(() => fetchJson('/chat'));

    this.messageReceived(msg => {
      if (!this._chatSummary.data) {
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
    });
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

  async acknowledge(id: string | string[], uidFrom: string) {
    const msg: MessageReceivedMessage = {
      m: 'message_received',
      id,
    }
    webSocketService.sendJson(msg);

    if (this._chatSummary.data) {
      const summaries = this._chatSummary.data;
      const index = summaries.findIndex(c => c.uid === uidFrom);
      if (index !== -1) {
        const count = Array.isArray(id) ? id.length : 1;
        if (summaries[index].unread !== undefined) {
          summaries[index].unread! -= count;
          if (summaries[index].unread! < 0) {
            summaries[index].unread = 0;
          }
        }
        this._chatSummary.publish();
      }
    } else {
      this._chatSummary.refresh();
    }
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

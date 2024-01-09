import Entity from './entity';
import webSocketService, { type SubscriberLike } from './websocket';
import { fetchJson } from '../js/fetch';
import {
  ChatSummary, ChatMessage
} from 'oi-types/chat';
import {
  ClientChatMessage, ServerChatMessage, MessageSentMessage,
  MessageReceivedMessage,
} from 'oi-types/message';

// Used by `ChatService.send`.
interface ChatMessage {
  to: string;
  text: string;
}

class ChatService {
  _chatSummary: Entity<ChatSummary[]>;

  constructor() {
    this._chatSummary = new Entity(() => fetchJson('/chat'));

    this.messageReceived(msg => this._newMessage(msg));
  }

  _newMessage(msg: ServerChatMessage) {
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

  getChat(id: string): Promise<ChatMessage> {
    return fetchJson(`/chat/${id}`).then(chat => {
      chat.sent = new Date(chat.sent);
      chat.received = new Date(chat.received);
      return chat;
    });
  }

  getChatSummary() {
    return this._chatSummary;
  }

  messageSent(subscriber: SubscriberLike<MessageSentMessage>) {
    return webSocketService.subscribe<MessageSentMessage>('message_sent', subscriber);
  }

  messageReceived(subscriber: SubscriberLike<ServerChatMessage>) {
    return webSocketService.subscribe<ServerChatMessage>('chat', subscriber);
  }

  acknowledge(id: string | string[], uidFrom: string) {
    if (Array.isArray(id) && id.length === 0) {
      return;
    }

    const msg: MessageReceivedMessage = {
      m: 'message_received',
      id,
    }
    webSocketService.sendJson(msg);

    this._markMessageRead(uidFrom, Array.isArray(id) ? id.length : 1);
  }

  send(msg: ChatMessage) {
    const outgoingMsg: ClientChatMessage = {
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

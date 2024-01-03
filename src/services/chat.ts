import { Observable } from 'rxjs';
import webSocketService, { type SubscriberLike } from './websocket';
import { fetchJson } from '../js/fetch';

interface UserChatSummary {
  uid: string;
  name: string;
  username: string;
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

class ChatService {
  getChat(id: string) {
    return fetchJson(`/chat/${id}`);
  }

  observeChatSummary() {
    return new Observable<UserChatSummary>(subscriber => {
      (async () => {
        const chats: UserChatSummary[] = await fetchJson('/chat');
        chats.forEach(chat => subscriber.next(chat));
      })();
    });
  }

  messageSent(subscriber: SubscriberLike<UserMessageSentMessage>) {
    return webSocketService.subscribe<UserMessageSentMessage>('message_sent', subscriber);
  }

  messageReceived(subscriber: SubscriberLike<IncomingUserChatMessage>) {
    return webSocketService.subscribe<IncomingUserChatMessage>('chat', subscriber);
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

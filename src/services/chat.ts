import { Observable } from 'rxjs';
import webSocketService from './websocket';
import { fetchJson } from '../js/fetch';

interface UserChatSummary {
  uid: string;
  name: string;
  username: string;
}

interface ChatMessage {
  to: string;
  text: string;
}

interface UserMessageSentMessage {
  message: 'message_sent';
  uuid: string;
  id: string;
  time: string;
}

interface OutgoingUserChatMessage extends ChatMessage {
  message: 'chat';
  uuid: string;
}

interface IncomingUserChatMessage extends ChatMessage {
  message: 'chat';
  from: string;
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

  observeMessageSent() {
    return new Observable<UserMessageSentMessage>(subscriber => {
      const subscription =
        webSocketService.subscribe<UserMessageSentMessage>('message_sent', msg => {
          subscriber.next(msg);
        });
      return () => subscription.unsubscribe();
    });
  }

  observeMessageReceived() {
    return new Observable<IncomingUserChatMessage>(subscriber => {
      const subscription =
        webSocketService.subscribe<IncomingUserChatMessage>('chat', msg => {
          subscriber.next(msg);
        });
      return () => subscription.unsubscribe();
    });
  }

  send(msg: ChatMessage) {
    const outgoingMsg: OutgoingUserChatMessage = {
      message: 'chat',
      uuid: crypto.randomUUID(),
      ...msg,
    };
    webSocketService.sendJson(outgoingMsg);
    return outgoingMsg;
  }
}

const service = new ChatService;
export default service;

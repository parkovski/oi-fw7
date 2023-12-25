import { Observable } from 'rxjs';
//import type { Subscriber, TeardownLogic } from 'rxjs';
import webSocketService from './websocket';
import { fetchJson } from '../js/fetch';

//type SubscriberLike<T> = Subscriber<T> | ((msg: T) => TeardownLogic);

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
  _queue: OutgoingUserChatMessage[] = [];

  constructor() {
    /*
    webSocketService.subscribe<IncomingUserChatMessage>('chat', _msg => {
    });*/
    webSocketService.subscribe<UserMessageSentMessage>('message_sent', msg => {
      console.log('message ' + msg.uuid + ' sent confirmation');
      this._queue = this._queue.filter(m => m.uuid !== msg.uuid);
    });

    /*
    webSocketService.subscribe<IncomingGroupChatMessage>('groupchat', _msg => {
    });
    webSocketService.subscribe<GroupMessageSentMessage>('group_message_sent', msg => {
      this._groupQueue = this._groupQueue.filter(m => m.uuid !== msg.uuid);
    });
    */
  }

  observeChatSummary() {
    return new Observable<UserChatSummary>(subscriber => {
      (async () => {
        const chats: UserChatSummary[] = await fetchJson('/chat');
        chats.forEach(chat => subscriber.next(chat));
      })();
    });
  }

  send(msg: ChatMessage) {
    const outgoingMsg: OutgoingUserChatMessage = {
      message: 'chat',
      uuid: crypto.randomUUID(),
      ...msg,
    };
    this._queue.push(outgoingMsg);
    webSocketService.sendJson(outgoingMsg);
    console.log('posted message ' + outgoingMsg.uuid + ': ' + msg.text);
  }
}

const service = new ChatService;
export default service;

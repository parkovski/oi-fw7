import type { Message } from './messages';

export interface ChatSummary {
  uid: string;
  name: string;
  username: string;
  unread?: number;
}

// Chat message type sent from client to server.
export interface ClientChatMessage extends Message {
  m: 'chat';
  to: string;
  text: string;
  uuid: string;
}

// Chat message type sent from server to client.
export interface ServerChatMessage extends Message {
  m: 'chat';
  id: string;
  from: string;
  fromName: string;
  time: string;
  text: string;
}

export interface MessageSentMessage extends Message {
  m: 'message_sent';
  uuid: string;
  id: string;
  time: string;
  text: string;
}

export interface MessageReceivedMessage extends Message {
  m: 'message_received';
  id: string | string[];
}

import type { Message } from './message';
import type { Membership } from './group';

// Group message type sent from client to server.
export interface ClientGroupMessage extends Message {
  m: 'groupchat';
  to: string;
  text: string;
  uuid: string;
}

// Group message type sent from server to client.
export interface ServerGroupMessage extends Message {
  m: 'groupchat';
  id: string;
  from: string;
  fromName: string;
  to: string;
  time: string;
  text: string;
}

// Group chat type returned by the HTTP API.
export interface GroupChatSummary {
  id: string;
  uid_from: string;
  name: string;
  username: string;
  message: string;
  sent: string; // or Date?
  received: string;
}

export interface GroupMessageSentMessage extends Message {
  m: 'group_message_sent';
  uuid: string;
  id: string;
  time: string;
  text: string;
}

export interface GroupMessageReceivedMessage {
  m: 'group_message_received';
  id: string | string[];
}

export interface GroupMembershipChangedMessage {
  m: 'group_membership_changed';
  id: string;
  kind: Membership | null;
}

import { Membership } from './group';
import { AttendanceKind } from './event';

export interface Message {
  m: string;
}

// Events {{{

export interface EventAddedMessage {
  m: 'event_added';
  id: string;
  title: string;
}

export interface EventRemovedMessage {
  m: 'event_removed';
  id: string;
}

export interface EventAttendanceChangedMessage {
  m: 'event_attendance_changed',
  id: string;
  kind: number;
  // Must be defined when this message is sent via push.
  title?: string;
}

export interface EventCommented {
  m: 'event_commented';
  id: string;
  name: string;
  title: string;
  text: string;
}

export interface EventRespondedMessage {
  m: 'event_responded';
  id: string;
  name: string;
  kind: AttendanceKind;
  title: string;
}

// }}}

// Contacts {{{

export interface ContactRequestedMessage {
  m: 'contact_requested';
  id: string;
  name: string;
}

export interface ContactRequestApprovedMessage {
  m: 'contact_request_approved';
  id: string;
  name: string;
}

export interface ContactAddedMessage {
  m: 'contact_added';
  id: string;
  name: string;
}

// }}}

// Chat {{{

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

// }}}

// Group {{{

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

export interface GroupEventCreatedMessage {
  m: 'group_event_created';
  gid: string;
  eid: string;
}

// }}}

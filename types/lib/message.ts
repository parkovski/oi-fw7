export interface Message {
  m: string;
}

// Events {{{

export interface EventAddedMessage {
  m: 'event_added';
  id: string;
  name: string;
}

export interface EventRemovedMessage {
  m: 'event_removed';
  id: string;
}

export interface EventAttendanceChangedMessage {
  m: 'event_attendance_changed',
  id: string;
  kind: number;
}

// }}}

// Contacts {{{

export interface ContactRequestedMessage {
  m: 'contact_requested';
  id: string;
  name: string;
}

export interface ContactRequestChangedMessage {
  m: 'contact_request_approved' | 'contact_request_denied';
  id: string;
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

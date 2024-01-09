export interface Message {
  m: string;
}

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

export interface ContactRequestedMessage {
  m: 'contact_requested';
  id: string;
  name: string;
}

export interface ContactRequestChangedMessage {
  m: 'contact_request_approved' | 'contact_request_denied';
  id: string;
}

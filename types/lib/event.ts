export const enum AttendanceKind {
  NotAttending = -1,
  Invited = 0,
  MaybeAttending = 1,
  Attending = 2,
  Hosting = 3,
}

export interface EventMember {
  id: string;
  name: string;
  username: string;
  kind: AttendanceKind;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  place: string | null;
  startTime: Date;
  endTime: Date;
  public: boolean;
  kind: AttendanceKind | null;
  members?: EventMember[];
}

export interface EventSummary {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  public: boolean;
  kind: AttendanceKind;
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

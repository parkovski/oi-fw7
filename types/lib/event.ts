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

export interface EventComment {
  id: string;
  from: string;
  fromName: string;
  avatarUrl: string | null;
  //sent: Date;
  message: string;
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
  comments?: EventComment[];
  coverPhoto: string | null;
  photos?: string[];
}

export interface EventSummary {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  public: boolean;
  kind: AttendanceKind;
}

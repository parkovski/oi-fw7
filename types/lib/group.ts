import { AttendanceKind } from './event';
export { AttendanceKind };
import { EventMember } from './event';
export type { EventMember };

export const enum Membership {
  Requested = -1,
  Invited = 0,
  Member = 1,
  Admin = 2,
}

export interface GroupSummary {
  id: string;
  name: string;
  memberKind: Membership;
  unreadMessages?: number;
  upcomingEvents?: number;
}

export interface GroupMember {
  id: string;
  name: string;
  username: string;
  kind: Membership;
}

export interface Group {
  id: string;
  name: string;
  public: boolean;
  description: string | null;
  memberKind: Membership | null;
  members?: GroupMember[];
  unreadMessages?: number;
  upcomingEvents?: number;
}

export interface GroupEventSummary {
  id: string;
  gid: string;
  title: string;
  startTime: Date;
  endTime: Date;
  kind: AttendanceKind | null;
}

export interface GroupEvent {
  id: string;
  gid: string;
  title: string;
  description: string | null;
  place: string | null;
  startTime: Date;
  endTime: Date;
  kind: AttendanceKind | null;
  members?: EventMember[];
}

// Group chat type returned by the HTTP API.
export interface GroupChatSummary {
  id: string;
  from: string;
  fromName: string;
  fromUsername: string;
  message: string;
  sent: string; // or Date?
  received: string;
}

export interface UnreadMessage {
  count: number;
  gid: string;
}

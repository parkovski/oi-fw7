import { AttendanceKind } from './event';
export { AttendanceKind };
import { EventMember } from './event';
export type { EventMember };

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

export interface GroupEventCreatedMessage {
  m: 'group_event_created';
  gid: string;
  eid: string;
}

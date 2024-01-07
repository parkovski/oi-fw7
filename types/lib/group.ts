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
  memberKind: Membership | null;
  members?: GroupMember[];
  unreadMessages?: number;
  upcomingEvents?: number;
}

export interface GroupInviteSummary {
  id: `groupinvite:${string}`;
  name: string;
}

export interface EventSummary {
  id: `event:${string}`;
  name: string;
  date: string;
}

export type Summary =
  | GroupInviteSummary
  | EventSummary
  ;

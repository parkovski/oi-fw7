export interface Summary {
  id: `${string}:${string}`;
  name: string;
  date?: string;
}

export interface GroupInviteSummary extends Summary {
  id: `groupinvite:${string}`;
  name: string;
}

export interface EventSummary extends Summary {
  id: `event:${string}`;
  name: string;
  date: string;
}

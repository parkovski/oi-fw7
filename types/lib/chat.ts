export interface ChatSummary {
  uid: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  unread?: number;
}

export interface ChatMessage {
  id: string;
  from: string;
  fromName: string;
  fromUsername: string;
  to: string;
  text: string;
  sent: Date; // Date???
  received: Date;
}

export interface UnreadMessageSummary {
  count: number;
  uid: string;
}

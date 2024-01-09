export interface ChatSummary {
  uid: string;
  name: string;
  username: string;
  unread?: number;
}

export interface ChatMessage {
  id: string;
  from: string;
  fromName: string;
  to: string;
  text: string;
  sent: Date; // Date???
  received: Date;
}

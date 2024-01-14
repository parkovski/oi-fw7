export const enum ContactKind {
  Requested = 0,
  Approved = 1,
}

export interface MinUser {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface User {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  kind?: ContactKind;
}

export interface ContactData {
  contacts: User[];
  followers: User[];
  pending: User[];
}

export interface Profile {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  verified: boolean;
  public: boolean;
}

export interface AuthInfo {
  id: string;
  pwhash: string;
}

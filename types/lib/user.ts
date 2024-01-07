export const enum ContactKind {
  Requested = 0,
  Approved = 1,
}

export interface MinUser {
  id: string;
  name: string;
  username: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  kind?: ContactKind;
  uid_contact?: string;
  has_contact?: boolean | 'pending';
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
  email?: string;
  phone?: string;
  verified: boolean;
}

export interface AuthInfo {
  id: string;
  pwhash: string;
}

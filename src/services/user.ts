import Entity from './entity';
import { fetchAny, fetchText, fetchJson } from '../js/fetch';

interface User {
  id: string;
  name: string;
  username: string;
  has_contact?: boolean | 'pending';
  kind?: number | null;
}

interface ContactData {
  contacts: User[];
  pending: User[];
}

function fetchUser(id: string) {
  return fetchJson(`/user/${id}`);
}

class UserService {
  users = new Map<string, Entity<User>>;
  contacts: Entity<ContactData>;
  requests: Entity<User[]>;

  constructor() {
    this.contacts = new Entity(() => fetchJson(`/contacts`));
    this.requests = new Entity(() => fetchJson(`/contactrequests`));
  }

  getContacts(): Entity<ContactData> {
    return this.contacts;
  }

  getContactRequests(): Entity<User[]> {
    return this.requests;
  }

  getUser(id: string): Entity<User> {
    let user = this.users.get(id);
    if (!user) {
      user = new Entity(() => fetchUser(id));
      this.users.set(id, user);
    }
    return user;
  }

  async addContact(id: string) {
    try {
      const user = this.getUser(id);
      const status = await fetchText(`/contacts/${id}/add`, { method: 'POST' });
      const userData = await user.ensureLoaded();
      const contactsData = await this.contacts.ensureLoaded();
      if (status === 'approved') {
        userData.has_contact = true;
        userData.kind = 1;
        contactsData.contacts.push(userData);
      } else if (status === 'requested') {
        userData.has_contact = 'pending';
        userData.kind = 0;
        contactsData.pending.push(userData);
      }
      user.publish();
      this.contacts.publish();
    } catch {
    }
  }

  async removeContact(id: string) {
    try {
      const user = this.getUser(id);
      if ((await fetchAny(`/contacts/${id}/remove`, { method: 'POST' })).ok) {
        const userData = await user.ensureLoaded();
        const contactsData = await this.contacts.ensureLoaded();
        userData.kind = null;
        this.contacts.data!.contacts = contactsData.contacts.filter(c => c.id !== id);
        this.contacts.data!.pending = contactsData.pending.filter(c => c.id !== id);
        user.publish();
        this.contacts.publish();
      }
    } catch {
    }
  }
}

const service = new UserService;
export default service;

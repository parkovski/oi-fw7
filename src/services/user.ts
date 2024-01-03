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
  _users = new Map<string, Entity<User>>;
  _contacts: Entity<ContactData>;
  _requests: Entity<User[]>;

  constructor() {
    this._contacts = new Entity(() => fetchJson(`/contacts`));
    this._requests = new Entity(() => fetchJson(`/contactrequests`));
  }

  getContacts(): Entity<ContactData> {
    return this._contacts;
  }

  getContactRequests(): Entity<User[]> {
    return this._requests;
  }

  getUser(id: string): Entity<User> {
    let user = this._users.get(id);
    if (!user) {
      user = new Entity(() => fetchUser(id));
      this._users.set(id, user);
    }
    return user;
  }

  async addContact(id: string) {
    try {
      const user = this.getUser(id);
      const status = await fetchText(`/contacts/${id}/add`, { method: 'POST' });
      const userData = await user.get();
      const contactsData = await this._contacts.get();
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
      this._contacts.publish();
    } catch {
    }
  }

  async removeContact(id: string) {
    try {
      const user = this.getUser(id);
      if ((await fetchAny(`/contacts/${id}/remove`, { method: 'POST' })).ok) {
        const userData = await user.get();
        const contactsData = await this._contacts.get();
        userData.kind = null;
        this._contacts.data!.contacts = contactsData.contacts.filter(c => c.id !== id);
        this._contacts.data!.pending = contactsData.pending.filter(c => c.id !== id);
        user.publish();
        this._contacts.publish();
      }
    } catch {
    }
  }

  async approveContact(id: string) {
    try {
      await fetchAny(`/contacts/${id}/approve`, { method: 'POST' });
      const requestsData = await this._requests.get();
      this._requests.data = requestsData.filter(c => c.id !== id);
      this._requests.publish();
    } catch {
    }
  }

  async denyContact(id: string) {
    try {
      await fetchAny(`/contacts/${id}/deny`, { method: 'POST' });
      const requestsData = await this._requests.get();
      this._requests.data = requestsData.filter(c => c.id !== id);
      this._requests.publish();
    } catch {
    }
  }
}

const service = new UserService;
export default service;

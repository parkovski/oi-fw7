import Entity from './entity';
import { fetchAny, fetchJson } from '../js/fetch';

interface User {
  id: string;
  name: string;
  username: string;
  has_contact?: boolean;
}

function fetchUser(id: string) {
  return fetchJson(`/user/${id}`);
}

class UserService {
  users = new Map<string, Entity<User>>;
  contacts: Entity<User[]>;

  constructor() {
    this.contacts = new Entity(async () => {
      const contacts = await fetchJson(`/contacts`);
      this._mapContacts(contacts);
      return contacts;
    });
  }

  _mapContacts(data: User[]) {
    data.forEach(contact => {
      let entity;
      if (this.users.has(contact.id)) {
        entity = this.users.get(contact.id)!;
        entity.data = contact;
        entity.data.has_contact = true;
        entity.publish();
      } else {
        entity = new Entity(() => fetchUser(contact.id));
        entity.data = contact;
        entity.data.has_contact = true;
        this.users.set(contact.id, entity);
      }
    });
  }

  getContacts(): Entity<User[]> {
    return this.contacts;
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
    const user = this.getUser(id);
    if ((await fetchAny(`/contacts/${id}/add`, { method: 'POST' })).ok) {
      const userData = await user.ensureLoaded();
      const contactsData = await this.contacts.ensureLoaded();
      userData.has_contact = true;
      contactsData.push(user.data!);
      user.publish();
      this.contacts.publish();
    }
  }

  async removeContact(id: string) {
    const user = this.getUser(id);
    if ((await fetchAny(`/contacts/${id}/remove`, { method: 'POST' })).ok) {
      const userData = await user.ensureLoaded();
      const contactsData = await this.contacts.ensureLoaded();
      userData.has_contact = false;
      this.contacts.data = contactsData.filter(c => c.id !== id);
      user.publish();
      this.contacts.publish();
    }
  }
}

const service = new UserService;
export default service;

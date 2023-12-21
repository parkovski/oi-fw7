import Entity from './entity';
import { fetchAny, fetchJson } from '../js/fetch';

function fetchUser(id) {
  return fetchJson(`/user/${id}`);
}

class UserService {
  users = new Map;
  contacts = null;

  _mapContacts(data) {
    data.forEach(contact => {
      let entity;
      if (this.users.has(contact.id)) {
        entity = this.users.get(contact.id);
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

  getContacts() {
    if (!this.contacts) {
      this.contacts = new Entity(async () => {
        const contacts = await fetchJson(`/contacts`);
        this._mapContacts(contacts);
        return contacts;
      });
    }
    return this.contacts;
  }

  getUser(id) {
    let user = this.users.get(id);
    if (!user) {
      user = new Entity(() => fetchUser(id));
      this.users.set(id, user);
    }
    return user;
  }

  async addContact(id) {
    const user = this.getUser(id);
    if ((await fetchAny(`/contacts/${id}/add`, { method: 'POST' })).ok) {
      user.data.has_contact = true;
      this.contacts.data.push(user.data);
      user.publish();
      this.contacts.publish();
    }
  }

  async removeContact(id) {
    const user = this.getUser(id);
    if ((await fetchAny(`/contacts/${id}/remove`, { method: 'POST' })).ok) {
      user.data.has_contact = false;
      this.contacts.data = this.contacts.data.filter(c => c.id !== id);
      user.publish();
      this.contacts.publish();
    }
  }
}

const service = new UserService;
export default service;

import { Service } from './base';
import { fetchAny, fetchJson } from '../js/oifetch';

export default class UserService extends Service {
  id;

  constructor(id) {
    super();
    this.id = id;
  }

  load() {
    return fetchJson(`/user/${this.id}`);
  }

  async addContact() {
    if ((await fetchAny(`/contacts/${this.id}/add`, { method: 'POST' })).ok) {
      this.data.has_contact = true;
      this.publish();
    }
  }

  async removeContact() {
    if ((await fetchAny(`/contacts/${this.id}/remove`, { method: 'POST' })).ok) {
      this.data.has_contact = false;
      this.publish();
    }
  }
}

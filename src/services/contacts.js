import { SingletonService } from './base';
import { fetchAny, fetchJson } from '../js/oifetch';

export default class ContactsService extends SingletonService {
  load() {
    return fetchJson('/contacts');
  }

  async add(uid) {
    if ((await fetchAny(`/contacts/${uid}/add`, { method: 'POST' })).ok) {
      await this.refresh();
      return true;
    }
    return false;
  }

  async remove(uid) {
    if ((await fetchJson(`/contacts/${uid}/remove`, { method: 'POST' })).ok) {
      await this.refresh();
      return true;
    }
    return false;
  }
}

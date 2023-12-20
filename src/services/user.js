import { Service } from './base';
import { fetchJson } from '../js/oifetch';

export default class UserService extends Service {
  id;

  constructor(id) {
    super();
    this.id = id;
  }

  load() {
    return fetchJson(`/user/${this.id}`);
  }
}

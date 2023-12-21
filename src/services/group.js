import { Service } from './base';
import { fetchJson } from '../js/fetch';

export default class GroupService extends Service {
  gid;

  constructor(gid) {
    super();
    this.gid = gid;
  }

  load() {
    return fetchJson(`/groups/${this.gid}`);
  }
};

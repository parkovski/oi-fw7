import Entity from './entity';
import { fetchJson } from '../js/fetch';

class GroupService {
  groups = null;
  groupMap = new Map;

  constructor() {
    this.groups = new Entity(() => fetchJson(`/groups`));
  }

  getGroups() {
    return this.groups;
  }

  getGroup(id) {
    let group = this.groupMap.get(id);
    if (!group) {
      group = new Entity(() => fetchJson(`/groups/${id}`));
      this.groupMap.set(id, group);
    }
    return group;
  }
}

const service = new GroupService;
export default service;

import Entity from './entity';
import { fetchJson } from '../js/fetch';

interface Group {
  id: string;
  name: string;
}

class GroupService {
  groups: Entity<Group>;
  groupMap = new Map<string, Entity<Group>>;

  constructor() {
    this.groups = new Entity<Group>(() => fetchJson(`/groups`));
  }

  getGroups() {
    return this.groups;
  }

  getGroup(id: string) {
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

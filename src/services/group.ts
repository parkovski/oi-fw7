import Entity from './entity';
import { fetchJson } from '../js/fetch';

const enum Membership {
  Invited,
  Member,
  Admin
}

interface ListGroup {
  id: string;
  name: string;
  kind: Membership;
}

interface Member {
  id: string;
  name: string;
  username: string;
  kind: Membership;
}

interface Group {
  id: string;
  name: string;
  members?: Member[];
}

class GroupService {
  groups: Entity<ListGroup[]>;
  groupMap = new Map<string, Entity<Group>>;

  constructor() {
    this.groups = new Entity<ListGroup[]>(() => fetchJson(`/groups`));
  }

  getGroups() {
    return this.groups;
  }

  getGroup(id: string) {
    let group = this.groupMap.get(id);
    if (!group) {
      group = new Entity<Group>(() => fetchJson(`/groups/${id}`));
      this.groupMap.set(id, group);
    }
    return group;
  }
}

const service = new GroupService;
export default service;

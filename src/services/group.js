import ServiceBase from './base';
import { fetchJson } from '../js/oifetch';

export default class GroupService extends ServiceBase {
  gid;

  constructor(gid) {
    super();
    this.gid = gid;
  }

  async load() {
    const info = await Promise.all([
      fetchJson(`/groups/${this.gid}`),
      fetchJson(`/groups/${this.gid}/members`),
    ]);
    info[0].members = info[1];
    return info[0];
  }
};

//import { getGroups } from '../js/mockdata';
import ServiceBase from './base';
import { fetchJson } from '../js/oifetch';

export default class GroupsService extends ServiceBase {
  load() {
    return fetchJson('/groups');
  }
};

import { SingletonService } from './base';
import { fetchJson } from '../js/oifetch';

export default class GroupsService extends SingletonService {
  load() {
    return fetchJson('/groups');
  }
};

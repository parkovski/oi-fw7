import { SingletonService } from './base';
import { fetchJson } from '../js/fetch';

export default class GroupsService extends SingletonService {
  load() {
    return fetchJson('/groups');
  }
};

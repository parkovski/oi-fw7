import { getGroups } from '../js/mockdata';
import store from '../js/store';

export default class GroupsService {
  constructor() {
    this.refresh();
  }

  async refresh() {
    store.dispatch('setGroups', await getGroups());
  }
};

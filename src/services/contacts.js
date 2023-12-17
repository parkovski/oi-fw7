import { getUsers } from '../js/mockdata';
import store from '../js/store';

export default class ContactsService {
  constructor() {
    this.refresh();
  }

  async refresh() {
    store.dispatch('setContacts', await getUsers());
  }
}

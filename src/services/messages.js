import { getThreads } from '../js/mockdata';
import store from '../js/store';

export default class MessagesService {
  constructor() {
    this.refresh();
  }

  async refresh() {
    store.dispatch('setMessages', await getThreads());
  }
};

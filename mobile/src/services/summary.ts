import Entity from './entity';
import { Summary } from 'oi-types/summary';
import { fetchJson } from '../js/fetch';
//import groupService from './group';

class SummaryService {
  _items: Entity<Summary[]>;

  constructor() {
    this._items = new Entity(() => fetchJson('/home'));

    // TODO: This does not currently trigger when the user accepts or rejects a
    // group invite. Need a much more reactive API for this.
    /*groupService.membershipChanged(mem => {
      // Here the user has chosen to accept or reject the invite so it
      // shouldn't be shown on the front page anymore.
      if (!this._items.data) {
        return;
      }
      const id = `groupinvite:${mem.id}`;
      this._items.data = this._items.data.filter(i => i.id !== id);
      this._items.publish();
    });*/
  }

  getItems() {
    return this._items;
  }
}

const service = new SummaryService;
export default service;

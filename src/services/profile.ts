import Entity from './entity';
import { fetchJson } from '../js/fetch';
import { Profile } from 'oi-types/user';

class ProfileService {
  _profile: Entity<Profile>;

  constructor() {
    this._profile = new Entity(() => fetchJson(`/profile`));
  }

  getProfile() {
    return this._profile;
  }
}

const service = new ProfileService;
export default service;

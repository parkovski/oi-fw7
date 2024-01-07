import Entity from './entity';
import { fetchJson } from '../js/fetch';
import { Profile } from 'oi-types/user';
import { HomeItem } from 'oi-types/home';

class ProfileService {
  _profile: Entity<Profile>;

  constructor() {
    this._profile = new Entity(() => fetchJson(`/profile`));
  }

  getProfile() {
    return this._profile;
  }

  getHomeSummary(): Promise<HomeItem[]> {
    return fetchJson('/home');
  }
}

const service = new ProfileService;
export default service;

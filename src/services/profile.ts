import Entity from './entity';
import { fetchJson } from '../js/fetch';

interface Profile {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  verified: boolean;
}

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

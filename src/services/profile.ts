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
  profile: Entity<Profile>;

  constructor() {
    this.profile = new Entity(() => fetchJson(`/profile`));
  }

  getProfile() {
    return this.profile;
  }
}

const service = new ProfileService;
export default service;

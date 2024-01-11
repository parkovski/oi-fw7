import Entity from './entity';
import { fetchAny, fetchJson } from '../js/fetch';
import { Profile } from 'oi-types/user';

class ProfileService {
  _profile: Entity<Profile>;

  constructor() {
    this._profile = new Entity(() => fetchJson(`/profile`));
  }

  getProfile() {
    return this._profile;
  }

  async updateProfile(
    name?: string, username?: string, email?: string, phone?: string,
    isPublic?: string
  ) {
    await fetchAny(`/profile/update`, {
      method: 'POST',
      body: new URLSearchParams({
        name: name ?? '',
        username: username ?? '',
        email: email ?? '',
        phone: phone ?? '',
        public: isPublic ?? 'true',
      }),
    });
    this._profile.refresh();
  }
}

const service = new ProfileService;
export default service;

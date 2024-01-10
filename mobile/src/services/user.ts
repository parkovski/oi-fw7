import Entity from './entity';
import { fetchAny, fetchText, fetchJson } from '../js/fetch';
import webSocketService, { type SubscriberLike } from './websocket';
import { User, ContactData, ContactKind } from 'oi-types/user';
import {
  ContactRequestedMessage, ContactRequestApprovedMessage, ContactAddedMessage
} from 'oi-types/message';

class UserService {
  _users = new Map<string, Entity<User>>;
  _contacts: Entity<ContactData>;
  _requests: Entity<User[]>;

  constructor() {
    this._contacts = new Entity(() => fetchJson(`/contacts`));
    this._requests = new Entity(() => fetchJson(`/contactrequests`));

    this.contactRequested(() => {
      this._requests.refresh();
    });
    this.contactRequestApproved(() => {
      this._requests.refresh();
      this._contacts.refresh();
    });
    this.contactAdded(() => {
      this._contacts.refresh();
    });
  }

  getContacts(): Entity<ContactData> {
    return this._contacts;
  }

  getContactRequests(): Entity<User[]> {
    return this._requests;
  }

  async hasContact(id: string): Promise<boolean> {
    return (await fetchText(`/contacts/${id}/exists`)) === 'true';
  }

  getUser(id: string): Entity<User> {
    let user = this._users.get(id);
    if (!user) {
      user = new Entity(() => fetchJson(`/user/${id}`));
      this._users.set(id, user);
    }
    return user;
  }

  async addContact(id: string) {
    try {
      const user = this.getUser(id);
      const status = await fetchText(`/contacts/${id}/add`, { method: 'POST' });
      const userData = await user.get();
      const contactsData = await this._contacts.get();
      if (status === 'approved') {
        userData.kind = ContactKind.Approved;
        contactsData.contacts.push(userData);
      } else if (status === 'requested') {
        userData.kind = ContactKind.Requested;
        contactsData.pending.push(userData);
      }
      user.publish();
      this._contacts.publish();
    } catch {
    }
  }

  async removeContact(id: string) {
    try {
      const user = this.getUser(id);
      if ((await fetchAny(`/contacts/${id}/remove`, { method: 'POST' })).ok) {
        const userData = await user.get();
        const contactsData = await this._contacts.get();
        userData.kind = undefined;
        this._contacts.data!.contacts = contactsData.contacts.filter(c => c.id !== id);
        this._contacts.data!.pending = contactsData.pending.filter(c => c.id !== id);
        user.publish();
        this._contacts.publish();
      }
    } catch {
    }
  }

  async approveContact(id: string) {
    try {
      await fetchAny(`/contacts/${id}/approve`, { method: 'POST' });
      const requestsData = await this._requests.get();
      this._requests.data = requestsData.filter(c => c.id !== id);
      this._requests.publish();
    } catch {
    }
  }

  async denyContact(id: string) {
    try {
      await fetchAny(`/contacts/${id}/deny`, { method: 'POST' });
      const requestsData = await this._requests.get();
      this._requests.data = requestsData.filter(c => c.id !== id);
      this._requests.publish();
    } catch {
    }
  }

  contactRequested(subscriber: SubscriberLike<ContactRequestedMessage>) {
    webSocketService.subscribe('contact_requested', subscriber);
  }

  contactRequestApproved(subscriber: SubscriberLike<ContactRequestApprovedMessage>) {
    webSocketService.subscribe('contact_request_approved', subscriber);
  }

  contactAdded(subscriber: SubscriberLike<ContactAddedMessage>) {
    webSocketService.subscribe('contact_added', subscriber);
  }
}

const service = new UserService;
export default service;

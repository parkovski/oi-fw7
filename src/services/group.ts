import { Observable } from 'rxjs';
import Entity from './entity';
import { fetchJson, fetchText, fetchAny } from '../js/fetch';
import webSocketService, { type SubscriberLike } from './websocket';

const enum Membership {
  Requested = -1,
  Invited = 0,
  Member = 1,
  Admin = 2,
}

interface Member {
  id: string;
  name: string;
  username: string;
  kind: Membership;
}

interface Group {
  id: string;
  name: string;
  public: boolean;
  memberKind: number | null;
  members?: Member[];
}

interface GroupChatMessage {
  to: string;
  text: string;
}

interface OutgoingGroupChatMessage extends GroupChatMessage {
  m: 'groupchat';
  uuid: string;
}

interface IncomingGroupChatMessage extends GroupChatMessage {
  m: 'groupchat';
  from: string;
  time: string;
}

interface GroupMessageSentMessage {
  m: 'group_message_sent';
  uuid: string;
  id: string;
  time: string;
  text: string;
}

class GroupService {
  _groups: Entity<Group[]>;
  _groupMap = new Map<string, Entity<Group>>;

  constructor() {
    this._groups = new Entity<Group[]>(() => fetchJson(`/groups`));
  }

  getGroups() {
    return this._groups;
  }

  getGroup(id: string) {
    let group = this._groupMap.get(id);
    if (!group) {
      group = new Entity<Group>(() => fetchJson(`/groups/${id}`));
      this._groupMap.set(id, group);
    }
    return group;
  }

  getGroupChat(id: string) {
    return fetchJson(`/groups/${id}/chat`);
  }

  async newGroup(name: string, invited: string[], isPublic: boolean) {
    const gid = await fetchText(`/newgroup`, {
      method: 'POST',
      body: new URLSearchParams({
        name,
        invited: JSON.stringify(invited),
        public: ''+isPublic,
      }),
    });
    const groups = await this._groups.ensureLoaded();
    if (groups.findIndex(g => g.id === gid) === -1) {
      groups.push({
        id: gid,
        name,
        public: isPublic,
        memberKind: Membership.Admin,
      });
    }
    this._groups.publish();
    return gid;
  }

  getGroupRequests(id: string) {
    return fetchJson(`/groups/${id}/requests`);
  }

  approveGroupRequest(gid: string, uid: string) {
    return fetchAny(`/groups/${gid}/approve`, {
      method: 'POST',
      body: new URLSearchParams({
        uid,
      }),
    });
  }

  denyGroupRequest(gid: string, uid: string) {
    return fetchAny(`/groups/${gid}/deny`, {
      method: 'POST',
      body: new URLSearchParams({
        uid,
      }),
    });
  }

  inviteToGroup(gid: string, uids: string[]) {
    return fetchAny(`/groups/${gid}/invite`, {
      method: 'POST',
      body: new URLSearchParams({
        uids: JSON.stringify(uids),
      }),
    });
  }

  async joinGroup(id: string) {
    try {
      await fetchText(`/groups/${id}/join`, { method: 'POST' });
      const group = await this.getGroup(id).ensureLoaded();
      const groups = await this.getGroups().ensureLoaded();
      const index = groups.findIndex(g => g.id === id);
      if (index !== -1) {
        groups[index].memberKind = Membership.Member;
      } else {
        groups.push({
          id: group.id,
          name: group.name,
          public: group.public,
          memberKind: Membership.Member,
        });
      }
      this._groups.publish();
    } catch {
      // Probably the fetch failed - do nothing.
    }
  }

  async leaveGroup(id: string) {
    const res = await fetchAny(`/groups/${id}/leave`, { method: 'POST' });
    if (res.ok) {
      this._groups.data = this._groups.data!.filter(g => g.id !== id);
      this._groups.publish();
    }
  }

  messageSent(subscriber: SubscriberLike<GroupMessageSentMessage>) {
    return webSocketService.subscribe<GroupMessageSentMessage>('group_message_sent', subscriber);
  }

  messageReceived(subscriber: SubscriberLike<IncomingGroupChatMessage>) {
    return webSocketService.subscribe<IncomingGroupChatMessage>('groupchat', subscriber);
  }

  send(msg: GroupChatMessage) {
    const outgoingMsg: OutgoingGroupChatMessage = {
      m: 'groupchat',
      uuid: crypto.randomUUID(),
      ...msg,
    };
    webSocketService.sendJson(outgoingMsg);
    return outgoingMsg;
  }
}

const service = new GroupService;
export default service;

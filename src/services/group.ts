import { Observable } from 'rxjs';
import Entity from './entity';
import { fetchJson, fetchText, fetchAny } from '../js/fetch';
import webSocketService from './websocket';

const enum Membership {
  Requested = -1,
  Invited = 0,
  Member = 1,
  Admin = 2,
}

interface ListGroup {
  id: string;
  name: string;
  kind: Membership;
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
  groups: Entity<ListGroup[]>;
  groupMap = new Map<string, Entity<Group>>;

  constructor() {
    this.groups = new Entity<ListGroup[]>(() => fetchJson(`/groups`));
  }

  getGroups() {
    return this.groups;
  }

  getGroup(id: string) {
    let group = this.groupMap.get(id);
    if (!group) {
      group = new Entity<Group>(() => fetchJson(`/groups/${id}`));
      this.groupMap.set(id, group);
    }
    return group;
  }

  getGroupChat(id: string) {
    return fetchJson(`/groups/${id}/chat`);
  }

  newGroup(name: string, invited: string[], isPublic: boolean) {
    return fetchText(`/newgroup`, {
      method: 'POST',
      body: new URLSearchParams({
        name,
        invited: JSON.stringify(invited),
        public: ''+isPublic,
      }),
    });
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

  async joinGroup(id: string) {
    try {
      await fetchText(`/groups/${id}/join`, { method: 'POST' });
      const group = await this.getGroup(id).ensureLoaded();
      this.groups.data!.push({
        id: group.id,
        name: group.name,
        kind: Membership.Member,
      });
      this.groups.publish();
    } catch {
      // Probably the fetch failed - do nothing.
    }
  }

  async leaveGroup(id: string) {
    const res = await fetchAny(`/groups/${id}/leave`, { method: 'POST' });
    if (res.ok) {
      this.groups.data = this.groups.data!.filter(g => g.id !== id);
      this.groups.publish();
    }
  }

  observeMessageSent() {
    return new Observable<GroupMessageSentMessage>(subscriber => {
      const subscription =
        webSocketService.subscribe<GroupMessageSentMessage>('group_message_sent', msg => {
          subscriber.next(msg);
        });
      return () => subscription.unsubscribe();
    });
  }

  observeMessageReceived() {
    return new Observable<IncomingGroupChatMessage>(subscriber => {
      const subscription =
        webSocketService.subscribe<IncomingGroupChatMessage>('groupchat', msg => {
          subscriber.next(msg);
        });
      return () => subscription.unsubscribe();
    });
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

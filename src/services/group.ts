import Entity from './entity';
import { fetchJson, fetchText, fetchAny } from '../js/fetch';
import webSocketService, { type SubscriberLike } from './websocket';

const enum Membership {
  Requested = -1,
  Invited = 0,
  Member = 1,
  Admin = 2,
}

interface GroupMembershipChangedMessage {
  m: 'group_membership_changed';
  id: string;
  kind: Membership | null;
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
  unreadMessages?: number;
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

interface GroupMessageReceivedMessage {
  m: 'group_message_received';
  id: string | string[];
}

class GroupService {
  _groups: Entity<Group[]>;
  _groupMap = new Map<string, Entity<Group>>;

  constructor() {
    this._groups = new Entity<Group[]>(() => fetchJson(`/groups`));

    this.membershipChanged(membership => {
      if (!this._groups.data) {
        return;
      }

      let mappedGroup = this._groupMap.get(membership.id)?.data;
      if (mappedGroup) {
        mappedGroup.memberKind = membership.kind;
      }

      if (membership.kind === null) {
        this._removeGroup(membership.id);
      } else {
        const index = this._groups.data.findIndex(g => g.id === membership.id);
        if (index === -1) {
          this.getGroup(membership.id).then(group => {
            this._addGroup(group);
          });
        } else {
          this._groups.data[index].memberKind = membership.kind;
          this._groups.publish();
        }
      }
    });

    this.messageReceived(msg => this._newMessage(msg));
  }

  _addGroup(group: Group) {
    this._groups.data!.push(group);
    this._groups.publish();
  }

  _removeGroup(id: string) {
    this._groups.data = this._groups.data!.filter(g => g.id !== id);
    this._groups.publish();
  }

  _newMessage(msg: IncomingGroupChatMessage) {
    if (msg.from === localStorage.getItem('uid')) {
      return;
    }
    if (!this._groups.data) {
      this._groups.refresh();
      return;
    }

    const index = this._groups.data.findIndex(g => g.id === msg.to);
    if (index === -1) {
      this._groups.refresh();
      return;
    } else if (this._groups.data[index].unreadMessages) {
      ++this._groups.data[index].unreadMessages!;
    } else {
      this._groups.data[index].unreadMessages = 1;
    }
    this._groups.publish();
  }

  _markMessageRead(gid: string, count: number) {
    if (!this._groups.data) {
      this._groups.refresh();
      return;
    }

    const index = this._groups.data.findIndex(g => g.id === gid);
    if (index === -1) {
      this._groups.refresh();
      return;
    }

    const group = this._groups.data[index];
    if (group.unreadMessages !== undefined) {
      group.unreadMessages -= count;
      this._groups.publish();
    }
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
    const group: Group = JSON.parse(await fetchText(`/newgroup`, {
      method: 'POST',
      body: new URLSearchParams({
        name,
        invited: JSON.stringify(invited),
        public: ''+isPublic,
      }),
    }));
    const groups = await this._groups.get();
    if (groups.findIndex(g => g.id === group.id) === -1) {
      groups.push(group);
      this._groups.publish();
    }
    return group.id;
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
      const groupEntity = this.getGroup(id);
      const group = await groupEntity.refresh();
      group.memberKind = Membership.Member;
      const groups = await this.getGroups().get();
      const index = groups.findIndex(g => g.id === id);
      if (index !== -1) {
        groups[index] = group;
      } else {
        groups.push(group);
      }
      this._groups.publish();
      groupEntity.publish();
    } catch {
      // Probably the fetch failed - do nothing.
    }
  }

  async leaveGroup(id: string) {
    try {
      await fetchAny(`/groups/${id}/leave`, { method: 'POST' });
      const group = this._groupMap.get(id);
      if (group && group.data) {
        const myUid = localStorage.getItem('uid');
        if (group.data.members) {
          group.data.members = group.data.members.filter(m => m.id !== myUid);
        }
        group.data.memberKind = null;
        group.publish();
      }
      if (this._groups.data) {
        this._groups.data = this._groups.data.filter(g => g.id !== id);
        this._groups.publish();
      }
    } catch (e) {
      console.error(e);
    }
  }

  messageSent(subscriber: SubscriberLike<GroupMessageSentMessage>) {
    return webSocketService.subscribe<GroupMessageSentMessage>('group_message_sent', subscriber);
  }

  messageReceived(subscriber: SubscriberLike<IncomingGroupChatMessage>) {
    return webSocketService.subscribe<IncomingGroupChatMessage>('groupchat', subscriber);
  }

  membershipChanged(subscriber: SubscriberLike<GroupMembershipChangedMessage>) {
    return webSocketService.subscribe<GroupMembershipChangedMessage>(
      'group_membership_changed', subscriber);
  }

  acknowledge(id: string | string[], gid: string) {
    const msg: GroupMessageReceivedMessage = {
      m: 'group_message_received',
      id,
    };
    webSocketService.sendJson(msg);

    this._markMessageRead(gid, Array.isArray(id) ? id.length : 1);
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

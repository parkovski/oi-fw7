import Entity from './entity';
import { fetchJson, fetchText, fetchAny } from '../js/fetch';
import webSocketService, { type SubscriberLike } from './websocket';
import {
  Membership, Group, GroupEventSummary, GroupEvent, AttendanceKind,
} from 'oi-types/group';
import {
  ClientGroupMessage, ServerGroupMessage, GroupMessageSentMessage, GroupMessageReceivedMessage,
  GroupMembershipChangedMessage, GroupEventCreatedMessage,
} from 'oi-types/message';

// Type used by `GroupService.send`.
export interface GroupMessage {
  to: string;
  text: string;
}

class GroupService {
  _groups: Entity<Group[]>;
  _groupMap = new Map<string, Entity<Group>>;
  _eventSummaryMap = new Map<string, Entity<GroupEventSummary[]>>;
  _eventMap = new Map<string, Entity<GroupEvent>>;

  constructor() {
    this._groups = new Entity<Group[]>(() => fetchJson(`/groups`));

    this.membershipChanged(msg => this._membershipChanged(msg));
    this.messageReceived(msg => this._newMessage(msg));
    this.eventCreated(msg => { this._eventCreated(msg.gid, msg.eid) });
  }

  _updateGroup(id: string, f: (group: Group) => void) {
    if (this._groups.data) {
      let group = this._groups.data.find(g => g.id === id);
      if (group) {
        f(group);
        this._groups.publish();
      }
    } else {
      this._groups.refresh();
    }
    let entity = this._groupMap.get(id);
    if (entity && entity.data) {
      f(entity.data);
      entity.publish();
    } else if (entity) {
      entity.refresh();
    } else {
      this.getGroup(id).refresh();
    }
  }

  _addGroup(group: Group) {
    this._groups.data!.push(group);
    this._groups.publish();
  }

  _removeGroup(id: string) {
    this._groups.data = this._groups.data!.filter(g => g.id !== id);
    this._groups.publish();
  }

  _newMessage(msg: ServerGroupMessage) {
    if (msg.from === localStorage.getItem('uid')) {
      return;
    }

    this._updateGroup(msg.to, g => {
      if (g.unreadMessages !== undefined) {
        ++g.unreadMessages;
      } else {
        g.unreadMessages = 1;
      }
    });
  }

  _markMessageRead(gid: string, count: number) {
    this._updateGroup(gid, g => {
      if (g.unreadMessages !== undefined) {
        g.unreadMessages -= count;
      }
    });
  }

  _membershipChanged(membership: GroupMembershipChangedMessage) {
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
  }

  async _eventCreated(gid: string, eid: string) {
    const eventsEntity = this.getEvents(gid);
    const events = await eventsEntity;
    if (events.findIndex(e => e.id === eid) === -1) {
      const event = await this.getEvent(eid);
      events.push({
        id: eid,
        gid,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        kind: event.kind,
      });
      eventsEntity.publish();

      this._updateGroup(gid, g => {
        if (g.upcomingEvents !== undefined) {
          ++g.upcomingEvents;
        } else {
          g.upcomingEvents = 1;
        }
      });
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

  async newGroup(name: string, invited: string[] | undefined, isPublic: boolean) {
    const group: Group = JSON.parse(await fetchText(`/newgroup`, {
      method: 'POST',
      body: new URLSearchParams({
        name,
        invited: invited && JSON.stringify(invited) || '[]',
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

  async deleteGroup(id: string) {
    try {
      await fetchAny(`/groups/${id}/delete`, { method: 'POST' });
      if (this._groupMap.has(id)) {
        this._groupMap.delete(id);
      }
      if (this._groups.data) {
        this._groups.data = this._groups.data.filter(g => g.id !== id);
        this._groups.publish();
      }
    } catch (e) {
      console.error(e);
    }
  }

  getEvents(gid: string) {
    let entity = this._eventSummaryMap.get(gid);
    if (!entity) {
      entity = new Entity<GroupEventSummary[]>(async () => {
        const events = await fetchJson(`/groups/${gid}/events`);
        events.forEach((event: any) => {
          event.startTime = new Date(event.startTime);
          event.endTime = new Date(event.endTime);
        })
        return events;
      });
      this._eventSummaryMap.set(gid, entity);
    }
    return entity;
  }

  getEvent(id: string) {
    let entity = this._eventMap.get(id);
    if (!entity) {
      entity = new Entity<GroupEvent>(async () => {
        const event = await fetchJson(`/groupevents/${id}`);
        event.startTime = new Date(event.startTime);
        event.endTime = new Date(event.endTime);
        return event;
      });
      this._eventMap.set(id, entity);
    }
    return entity;
  }

  async newEvent(gid: string, title: string, description: string | null,
                 place: string | null, startTime: Date, endTime: Date) {
    const eid = await fetchText(`/groups/${gid}/newevent`, {
      method: 'POST',
      body: new URLSearchParams({
        title,
        description: description || '',
        place: place || '',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }),
    });
    return eid;
  }

  async setAttendance(eid: string, kind: AttendanceKind) {
    await fetchText(`/groupevents/${eid}/setattendance`, {
      method: 'POST',
      body: new URLSearchParams({
        kind: '' + kind,
      }),
    });
    const eventEntity = this.getEvent(eid);
    const event = await eventEntity;
    event.kind = kind;
    eventEntity.publish();
    // TODO update value in _eventSummaryMap.
    const eventsEntity = this.getEvents(event.gid);
    const events = await eventsEntity;
    const eventSummary = events.find(e => e.id === eid);
    if (eventSummary) {
      eventSummary.kind = kind;
      eventsEntity.publish();
    }
  }

  messageSent(subscriber: SubscriberLike<GroupMessageSentMessage>) {
    return webSocketService.subscribe('group_message_sent', subscriber);
  }

  messageReceived(subscriber: SubscriberLike<ServerGroupMessage>) {
    return webSocketService.subscribe('groupchat', subscriber);
  }

  membershipChanged(subscriber: SubscriberLike<GroupMembershipChangedMessage>) {
    return webSocketService.subscribe('group_membership_changed', subscriber);
  }

  eventCreated(subscriber: SubscriberLike<GroupEventCreatedMessage>) {
    return webSocketService.subscribe('group_event_created', subscriber);
  }

  acknowledge(id: string | string[], gid: string) {
    if (Array.isArray(id) && id.length === 0) {
      return;
    }

    const msg: GroupMessageReceivedMessage = {
      m: 'group_message_received',
      id,
    };
    webSocketService.sendJson(msg);

    this._markMessageRead(gid, Array.isArray(id) ? id.length : 1);
  }

  send(msg: GroupMessage) {
    const outgoingMsg: ClientGroupMessage = {
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

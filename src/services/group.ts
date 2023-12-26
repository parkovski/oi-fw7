import { Observable } from 'rxjs';
import Entity from './entity';
import { fetchJson } from '../js/fetch';
import webSocketService from './websocket';

const enum Membership {
  Invited,
  Member,
  Admin
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
}

interface GroupMessageSentMessage {
  m: 'group_message_sent';
  uuid: string;
  id: string;
  time: string;
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

  observeMessageSent() {
    return new Observable<GroupMessageSentMessage>(subscriber => {
      const subscription =
        webSocketService.subscribe<GroupMessageSentMessage>('group_message_sent', msg => {
          subscriber.next(msg);
        });
      return () => subscription.unsubscribe();
    });
  }

  observeMesssageReceived() {
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

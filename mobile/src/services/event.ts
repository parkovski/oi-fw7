import Entity from './entity';
import { fetchJson, fetchText, fetchAny } from '../js/fetch';
import webSocketService, { type SubscriberLike } from './websocket';
import {
  AttendanceKind, Event, EventSummary,
} from 'oi-types/event';
import {
  EventAddedMessage, EventRemovedMessage, EventAttendanceChangedMessage,
} from 'oi-types/message';

class EventService {
  _events: Entity<EventSummary[]>;
  _eventMap: Map<string, Entity<Event>>;

  constructor() {
    this._events = new Entity<EventSummary[]>(async () => {
      const events = await fetchJson(`/events`);
      events.forEach((event: any) => {
        event.startTime = new Date(event.startTime);
        event.endTime = new Date(event.endTime);
      });
      return events;
    });
    this._eventMap = new Map;

    this.eventAdded(event => {
      if (!this._events.data) {
        this._events.refresh();
        return;
      }

      this.getEvent(event.id).then(e => {
        this._events.data!.push({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          public: e.public,
          kind: e.kind!,
        });
        this._events.publish();
      });
    });

    this.eventRemoved(event => {
      if (!this._events.data) {
        this._events.refresh();
        return;
      }

      this._events.data = this._events.data!.filter(e => e.id !== event.id);
      this._events.publish();
    });

    this.eventAttendanceChanged(event => {
      if (this._events.data) {
        let targetEvent = this._events.data.find(e => e.id === event.id);
        if (targetEvent) {
          targetEvent.kind = event.kind;
          this._events.publish();
        } else {
          this._events.refresh();
        }
      } else {
        this._events.refresh();
      }

      const mapped = this._eventMap.get(event.id);
      if (mapped && mapped.data) {
        mapped.data.kind = event.kind;
        mapped.publish();
      }
    });
  }

  getEvents() {
    return this._events;
  }

  getEvent(id: string) {
    let event = this._eventMap.get(id);
    if (!event) {
      event = new Entity<Event>(async () => {
        const event = await fetchJson(`/events/${id}`);
        event.startTime = new Date(event.startTime);
        event.endTime = new Date(event.endTime);
        event.comments && event.comments.reverse();
        return event;
      });
      this._eventMap.set(id, event);
    }
    return event;
  }

  setAttendance(id: string, kind: AttendanceKind) {
    return fetchText(`/events/${id}/setattendance`, {
      method: 'POST',
      body: new URLSearchParams({
        kind: '' + kind,
      })
    });
  }

  invite(id: string, uids: string[]) {
    return fetchAny(`/events/${id}/invite`, {
      method: 'POST',
      body: new URLSearchParams({
        uids: JSON.stringify(uids),
      }),
    });
  }

  addHosts(id: string, uids: string[]) {
    return fetchAny(`/events/${id}/makehost`, {
      method: 'POST',
      body: new URLSearchParams({
        uids: JSON.stringify(uids),
      }),
    })
  }

  async postComment(id: string, text: string) {
    // const commentId =
    await fetchText(`/events/${id}/comment`, {
      method: 'POST',
      body: new URLSearchParams({
        text,
      }),
    });
    await this.getEvent(id).refresh();
  }

  newEvent(title: string, description: string | null, place: string | null,
           startTime: Date, endTime: Date, isPublic: boolean, invited: string[] | undefined,
           coverPhoto: File | undefined, groupId: string | undefined) {
    const body = new FormData;
    body.append('title', title);
    description && body.append('description', description);
    place && body.append('place', place);
    body.append('startTime', startTime.toISOString());
    body.append('endTime', endTime.toISOString());
    body.append('public', ''+isPublic);
    invited && body.append('invited', JSON.stringify(invited));
    coverPhoto && body.append('coverPhoto', coverPhoto);
    groupId && body.append('groupId', groupId);
    return fetchText(`/newevent`, {
      method: 'POST',
      body,
    });
  }

  eventAdded(subscriber: SubscriberLike<EventAddedMessage>) {
    return webSocketService.subscribe('event_added', subscriber);
  }

  eventRemoved(subscriber: SubscriberLike<EventRemovedMessage>) {
    return webSocketService.subscribe('event_removed', subscriber);
  }

  eventAttendanceChanged(subscriber: SubscriberLike<EventAttendanceChangedMessage>) {
    return webSocketService.subscribe('event_attendance_changed', subscriber);
  }
}

const service = new EventService;
export default service;

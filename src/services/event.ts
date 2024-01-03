import Entity from './entity';
import { fetchJson, fetchText, fetchAny } from '../js/fetch';

export const enum AttendanceKind {
  NotAttending = -1,
  Invited = 0,
  MaybeAttending = 1,
  Attending = 2,
  Hosting = 3,
}

export interface EventSummary {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  public: boolean;
  kind: AttendanceKind;
}

export interface EventMember {
  id: string;
  name: string;
  username: string;
  kind: AttendanceKind;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  place: string;
  startTime: Date;
  endTime: Date;
  public: boolean;
  kind: AttendanceKind;
  members: EventMember[] | undefined;
}

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
        return event;
      });
      this._eventMap.set(id, event);
    }
    return event;
  }

  async setAttendance(id: string, kind: AttendanceKind) {
    await fetchText(`/events/${id}/setattendance`, {
      method: 'POST',
      body: new URLSearchParams({
        kind: '' + kind,
      })
    });
    const event = this.getEvent(id);
    (await event.ensureLoaded()).kind = kind;
    event.publish();
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

  async newEvent(title: string, description: string | null, place: string,
                 startTime: Date, endTime: Date, isPublic: boolean,
                 invited: string[] | undefined) {
    const eid = await fetchText(`/newevent`, {
      method: 'POST',
      body: new URLSearchParams({
        title,
        description: description || '',
        place,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        public: ''+isPublic,
        invited: invited && JSON.stringify(invited) || '[]',
      }),
    });
    const events = await this._events.ensureLoaded();
    if (events.findIndex(e => e.id === eid) === -1) {
      events.push({
        id: eid,
        title,
        startTime,
        endTime,
        public: isPublic,
        kind: AttendanceKind.Hosting,
      });
    }
    this._events.publish();
    return eid;
  }
}

const service = new EventService;
export default service;

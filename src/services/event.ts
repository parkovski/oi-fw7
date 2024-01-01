import Entity from './entity';
import { fetchJson, fetchText } from '../js/fetch';

interface Event {
  id: string;
  title: string;
  description: string | null;
  place: string;
  startTime: Date;
  endTime: Date;
  public: boolean;
}

class EventService {
  _events: Entity<Event[]>;

  constructor() {
    this._events = new Entity<Event[]>(() => fetchJson(`/events`));
  }

  getEvents() {
    return this._events;
  }

  async newEvent(title: string, description: string | null, place: string,
                 startTime: Date, endTime: Date, isPublic: boolean,
                 invited: string[]) {
    const eid = await fetchText(`/newevent`, {
      method: 'POST',
      body: new URLSearchParams({
        title,
        description: description || '',
        place,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        public: ''+isPublic,
        invited: JSON.stringify(invited),
      }),
    });
    const events = await this._events.ensureLoaded();
    if (events.findIndex(e => e.id === eid) === -1) {
      events.push({
        id: eid,
        title,
        description,
        place,
        startTime,
        endTime,
        public: isPublic,
      });
    }
    this._events.publish();
    return eid;
  }
}

const service = new EventService;
export default service;

import { Observable } from 'rxjs';

export class Service {
  loadfn;
  data = null;
  loading = false;
  subscribers = [];
  observable;

  constructor(load) {
    this.loadfn = load || this.load;
    this.observable = new Observable(subscriber => {
      this.subscribers.push(subscriber);
      if (this.data !== null) {
        subscriber.next(this.data);
      } else {
        this.refresh();
      }
    });
  }

  publish() {
    this.subscribers.forEach(s => s.next(this.data));
  }

  async refresh() {
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.data = await this.loadfn();
    this.loading = false;
    this.publish();
  }

  subscribe(subscriber) {
    const subscription = this.observable.subscribe(subscriber);
    subscription.add(() => {
      this.subscribers = this.subscribers.filter(s => s !== subscriber);
    });
    return subscription;
  }
}

const serviceMap = new Map;
export class SingletonService {
  _service;

  constructor() {
    if (!serviceMap.has(this.constructor)) {
      serviceMap.set(this.constructor, this._service = new Service(this.load.bind(this)));
    } else {
      this._service = serviceMap.get(this.constructor);
    }
  }

  publish() {
    this._service.publish();
  }

  refresh() {
    return this._service.refresh();
  }

  subscribe(subscriber) {
    return this._service.subscribe(subscriber);
  }
};

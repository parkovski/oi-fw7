import { Observable } from 'rxjs';

export default class Entity {
  data = null;
  loading = false;
  subscribers = [];
  load;
  observable;

  constructor(load) {
    this.load = load;
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
    if (this.data) {
      this.subscribers.forEach(s => s.next(this.data));
    } else {
      this.refresh();
    }
  }

  async refresh() {
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.data = await this.load();
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

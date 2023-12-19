import { Observable } from 'rxjs';

export default class ServiceBase {
  data = null;
  loading = false;
  subscribers = [];
  observable;

  constructor() {
    this.observable = new Observable(subscriber => {
      this.subscribers.push(subscriber);
      if (this.data !== null) {
        subscriber.next(this.data);
      } else if (!this.loading) {
        this.loading = true;
        this.load().then(data => {
          this.data = data;
          this.loading = false;
          this.subscribers.forEach(s => s.next(this.data));
        });
      }
    });
  }

  subscribe(subscriber) {
    const subscription = this.observable.subscribe(subscriber);
    subscription.add(() => {
      this.subscribers = this.subscribers.filter(s => s !== subscriber);
    });
    return subscription;
  }
};

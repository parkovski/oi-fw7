import { Observable } from 'rxjs';
import type { Subscriber } from 'rxjs';

type LoadFn<T> = () => Promise<T>;

export default class Entity<T> {
  data: T | null = null;
  loading: boolean = false;
  subscribers: Subscriber<T>[] = [];
  load: LoadFn<T>;
  observable: Observable<T>;

  constructor(load: LoadFn<T>) {
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

  async ensureLoaded(): Promise<T> {
    if (!this.data) {
      this.loading = true;
      await this.load();
      this.loading = false;
    }
    return this.data!;
  }

  publish() {
    if (this.data) {
      this.subscribers.forEach(s => s.next(this.data!));
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

  subscribe(subscriber: Subscriber<T>) {
    const subscription = this.observable.subscribe(subscriber);
    subscription.add(() => {
      this.subscribers = this.subscribers.filter(s => s !== subscriber);
    });
    return subscription;
  }
}

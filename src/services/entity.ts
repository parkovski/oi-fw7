import { Observable } from 'rxjs';
import type { Subscriber, TeardownLogic } from 'rxjs';

type LoadFn<T> = () => Promise<T>;
type SubscriberLike<T> = Subscriber<T> | ((msg: T) => TeardownLogic);

export default class Entity<T> {
  data: T | null = null;
  loading: Promise<T> | null = null;
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

  async get(): Promise<T> {
    if (!this.data) {
      try {
        this.loading = this.load();
        this.data = await this.loading;
      } finally {
        this.loading = null;
      }
    }
    return this.data!;
  }

  ensureLoaded(): Promise<T> {
    return this.get();
  }

  then(fn: (data: T) => void) {
    this.ensureLoaded().then(fn);
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
      await this.loading;
      return this.data!;
    }
    try {
      this.loading = this.load();
      this.data = await this.loading;
      this.publish();
      return this.data;
    } finally {
      this.loading = null;
    }
  }

  subscribe(subscriber: SubscriberLike<T>) {
    const subscription = this.observable.subscribe(subscriber);
    subscription.add(() => {
      this.subscribers = this.subscribers.filter(s => s !== subscriber);
    });
    return subscription;
  }
}

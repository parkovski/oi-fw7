import { Observable } from 'rxjs';
import type { Subscriber, TeardownLogic } from 'rxjs';

type LoadFn<T> = () => Promise<T>;
type ErrorFn = (e: any) => void;
type SubscriberLike<T> = Subscriber<T> | ((msg: T) => TeardownLogic);

export default class Entity<T> {
  data: T | null = null;
  loading: boolean = false;
  subscribers: Subscriber<T>[] = [];
  load: LoadFn<T>;
  error?: ErrorFn;
  observable: Observable<T>;

  constructor(load: LoadFn<T>, error?: ErrorFn) {
    this.load = load;
    this.error = error;
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
      try {
        this.data = await this.load();
      } catch (e) {
        if (this.error) {
          this.error(e);
        }
      } finally {
        this.loading = false;
      }
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
    try {
      this.data = await this.load();
      this.publish();
    } catch (e) {
      if (this.error) {
        this.error(e);
      }
    } finally {
      this.loading = false;
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

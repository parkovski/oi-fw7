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

  then<U = T, V = never>(
    onfulfilled?: ((data: T) => U | PromiseLike<U>) | null | undefined,
    onrejected?: ((reason: any) => V | PromiseLike<V>) | null | undefined
  ): Promise<U | V> {
    return this.get().then(onfulfilled, onrejected);
  }

  catch<U = never>(
    onrejected?: ((reason: any) => U | PromiseLike<U>) | null | undefined
  ): Promise<T | U> {
    return this.get().catch(onrejected);
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

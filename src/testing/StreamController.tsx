// StreamController is a hand-pumped AsyncIterable for tests that need to hold a
// stream open: emit() delivers the next value (waking a pending consumer or
// queuing until one asks), end() completes the iteration. Hand one to
// TestHarnessClient.queueInvokeStream to freeze a screen mid-stream, assert on
// the intermediate frame, then keep pumping.
export class StreamController<T> implements AsyncIterable<T> {
  private queue: T[] = [];
  private done = false;
  private waiters: ((result: IteratorResult<T>) => void)[] = [];

  // emit delivers `value` to the consumer (or queues it if none is waiting).
  emit(value: T): void {
    const waiter = this.waiters.shift();
    if (waiter) waiter({ value, done: false });
    else this.queue.push(value);
  }

  // end completes the stream once anything already emitted has been consumed.
  end(): void {
    this.done = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter({ value: undefined, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        if (this.queue.length > 0) {
          return Promise.resolve({ value: this.queue.shift()!, done: false });
        }
        if (this.done) {
          return Promise.resolve({ value: undefined, done: true });
        }
        return new Promise((resolve) => this.waiters.push(resolve));
      },
    };
  }
}

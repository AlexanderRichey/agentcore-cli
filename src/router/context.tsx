export interface Context {
  value(key: string): any
  withValue(key: string, value: any): Context
}

export class ValueContext implements Context {
  constructor(
    private readonly parent: Context | null = null,
    private readonly key: string,
    private readonly val: any,
  ) {}

  static EmptyContext(): Context {
    return new ValueContext(null, "", null)
  }

  /** Returns a new context that carries `key`/`value`, plus everything in this one. */
  withValue(key: string, value: any): ValueContext {
    return new ValueContext(this, key, value);
  }

  /** The value for `key`, searching up the parent chain; `undefined` if absent. */
  value(key: string): any {
    if (this.parent === null) return undefined;
    return key === this.key ? this.val : this.parent.value(key);
  }
}

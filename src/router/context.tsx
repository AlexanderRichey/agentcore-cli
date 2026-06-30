// ContextKey is a typed, collision-free handle for a value stored in a Context.
// The value type `V` is carried as a phantom; identity is the Symbol `id`, so two
// keys created with the same name are still distinct.
export interface ContextKey<V> {
  readonly id: symbol
  readonly name: string
  readonly _type?: V // phantom marker, never assigned
}

// contextKey creates a fresh, unique ContextKey for values of type `V`.
export function contextKey<V>(name: string): ContextKey<V> {
  return { id: Symbol(name), name }
}

export interface Context {
  // value returns the value previously stored under `key`, or undefined if absent.
  value<V>(key: ContextKey<V>): V | undefined
  // require returns the value stored under `key`, throwing if it is absent.
  require<V>(key: ContextKey<V>): V
  // withValue returns a new Context that carries `key`/`value` on top of this one.
  withValue<V>(key: ContextKey<V>, value: V): Context
}

export class ValueContext implements Context {
  private constructor(
    private readonly parent: Context | null,
    private readonly keyId: symbol | null,
    private readonly val: unknown,
  ) {}

  static EmptyContext(): Context {
    return new ValueContext(null, null, undefined)
  }

  /** Returns a new context that carries `key`/`value`, plus everything in this one. */
  withValue<V>(key: ContextKey<V>, value: V): Context {
    return new ValueContext(this, key.id, value)
  }

  /** The value for `key`, searching up the parent chain; `undefined` if absent. */
  value<V>(key: ContextKey<V>): V | undefined {
    if (this.keyId === key.id) return this.val as V
    return this.parent ? this.parent.value(key) : undefined
  }

  /** Like `value`, but throws when `key` is not present in the chain. */
  require<V>(key: ContextKey<V>): V {
    const found = this.value(key)
    if (found === undefined) {
      throw new Error(`Context is missing a required value for key '${key.name}'`)
    }
    return found
  }
}

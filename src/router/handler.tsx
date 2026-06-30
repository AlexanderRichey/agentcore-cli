import type z from "zod"
import type { Context, ContextKey } from "./context"

// Flag is generic over its literal name `N` and its inferred value type `T`, so a
// tuple of flags can be mapped to a typed object at the authoring boundary (see
// FlagsOf / createHandler). The runtime tree only ever sees the erased
// Flag<string, unknown>.
export interface Flag<N extends string = string, T = unknown> {
  name: N
  description: string
  schema: z.ZodType<T>
}

// GlobalFlag is a group-level flag that is *also* a typed ContextKey: declared on
// a Router, its validated value is injected into the context under itself, so any
// descendant handler can retrieve it type-safely via `ctx.value(theGlobalFlag)`.
export interface GlobalFlag<N extends string = string, T = unknown>
  extends ContextKey<T>,
    Flag<N, T> {
  // Reconcile ContextKey's `name: string` with Flag's `name: N`.
  name: N
}

// flag constructs a Flag while preserving the literal name and the type inferred
// from the zod schema. Prefer this over an object literal so that createHandler
// can infer a precise object for `handle`.
export function flag<N extends string, T>(
  name: N,
  description: string,
  schema: z.ZodType<T>,
): Flag<N, T> {
  return { name, description, schema }
}

// globalFlag constructs a GlobalFlag. The returned value doubles as the typed
// ContextKey used to read the flag back out of the context.
export function globalFlag<N extends string, T>(
  name: N,
  description: string,
  schema: z.ZodType<T>,
): GlobalFlag<N, T> {
  return { id: Symbol(name), name, description, schema }
}

// FlagsOf maps a tuple of Flags to a typed object keyed by each flag's literal
// name, with values typed by z.infer of each schema.
export type FlagsOf<F extends readonly Flag<string, any>[]> = {
  [E in F[number] as E["name"]]: E extends Flag<string, infer T> ? T : never
}

export interface Handler {
  name(): string
  description(): string
  flags(): Flag[]
  // At runtime `handle` receives the validated, coerced flags object. The precise
  // shape is supplied to authors via createHandler's generic; the interface keeps
  // it erased so middleware can forward it uniformly.
  handle(ctx: Context, flags: any): Promise<void>
  children(): Handler[]
}

type CreateHandlerInput<F extends readonly Flag<string, any>[]> = {
  name: string
  description: string
  flags?: F
  handle?: (ctx: Context, flags: FlagsOf<F>) => Promise<void>
  children?: Handler[]
}

const noOpHandler = async (_ctx: Context, _flags: any): Promise<void> => {}

class BaseHandler implements Handler {
  _name: string
  _description: string
  _flags: Flag[]
  _handle: (ctx: Context, flags: any) => Promise<void>
  _children: Handler[]

  constructor(input: CreateHandlerInput<readonly Flag<string, any>[]>) {
    this._name = input.name
    this._description = input.description
    this._flags = (input.flags ?? []) as Flag[]
    this._handle = (input.handle ?? noOpHandler) as (ctx: Context, flags: any) => Promise<void>
    this._children = input.children ?? []
  }

  name(): string {
    return this._name
  }

  description(): string {
    return this._description
  }

  flags(): Flag[] {
    return this._flags
  }

  async handle(ctx: Context, flags: any): Promise<void> {
    await this._handle(ctx, flags)
  }

  children(): Handler[] {
    return this._children
  }
}

// createHandler infers the flags tuple from `flags` (the `const` type parameter
// captures literal names), giving `handle` a precisely typed object derived from
// the zod schemas.
export function createHandler<const F extends readonly Flag<string, any>[] = readonly []>(
  input: CreateHandlerInput<F>,
): Handler {
  return new BaseHandler(input as CreateHandlerInput<readonly Flag<string, any>[]>)
}

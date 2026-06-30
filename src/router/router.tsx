import type { Flag, GlobalFlag, Handler } from "./handler"
import { type Middleware, type MiddlewareProvider, isMiddlewareProvider } from "./middleware"
import { type Context, type ContextKey, ValueContext, contextKey } from "./context"
import { applyGlobalFlags, parseFlags, toOption } from "./flags"

import { Command } from "commander"

// CommandKey exposes the Commander Command for the executing leaf via context.
export const CommandKey: ContextKey<Command> = contextKey<Command>("commander.command")

// declareFlags wires a node's zod-typed flags onto a Commander command. Each
// flag's option shape (value/toggle, variadic, required, default) is derived
// from its schema; see flags.ts/toOption.
function declareFlags(c: Command, flags: Flag[]): void {
  for (const flag of flags) {
    c.addOption(toOption(flag))
  }
}

// globalFlagsOf recovers the GlobalFlags (which double as context keys) from a
// node's declared flags. Only group flags created via globalFlag() carry a key.
function globalFlagsOf(node: Handler): GlobalFlag[] {
  return node.flags().filter((f): f is GlobalFlag => "id" in f)
}

// compile walks the Handler tree into a Commander Command tree.
//
// `stack` is the accumulated middleware declared by ancestors. A node's own
// middleware is appended before descending, so middleware applies *down* the
// tree. The stack is materialized only at leaves (branches never execute), and
// `reduceRight` makes ancestor middleware the outermost wrapper so it runs first.
//
// `inheritedGlobals` are the group-level flags declared by ancestor groups. They
// accumulate down the tree the same way; at a leaf each is validated and injected
// into the context under its own key, so any descendant can read a group-level /
// global flag via `ctx.value(theGlobalFlag)`. A leaf's *own* flags remain the
// statically-typed object handed to `handle`.
export function compile(
  node: Handler,
  ctx: Context,
  stack: Middleware[] = [],
  inheritedGlobals: GlobalFlag[] = [],
): Command {
  const c = new Command(node.name())
  c.description(node.description())

  const ownFlags = node.flags()
  declareFlags(c, ownFlags)

  const own = isMiddlewareProvider(node) ? node.middlewares() : []
  const nextStack = [...stack, ...own]

  const children = node.children()
  if (children.length > 0) {
    // A group's own global flags become inherited flags for everything beneath it.
    const childGlobals = [...inheritedGlobals, ...globalFlagsOf(node)]
    for (const child of children) {
      c.addCommand(compile(child, ctx, nextStack, childGlobals))
    }
  } else {
    // Middleware wraps the node here; the wrapper's logic runs at leaf execution.
    const wrapped = nextStack.reduceRight((h, mw) => mw(h), node)
    // `optsWithGlobals()` merges this command's options with all ancestors', so
    // group-level flags declared higher in the tree are visible here regardless
    // of where they appear on the command line.
    c.action(async (...actionArgs: unknown[]) => {
      const command = actionArgs[actionArgs.length - 1] as Command
      const globals = command.optsWithGlobals()

      // Inherited group/global flags -> context (typed, read via ctx.value(key)).
      let leafCtx = ctx.withValue(CommandKey, command)
      leafCtx = applyGlobalFlags(inheritedGlobals, globals, command, leafCtx)

      // Own flags -> the statically-typed object passed to handle.
      const parsed = parseFlags(ownFlags, globals, command)
      await wrapped.handle(leafCtx, parsed)
    })
  }

  return c
}

export class Router implements Handler, MiddlewareProvider {
  private mws: Middleware[] = []
  private handlers: Handler[] = []

  constructor(
    private readonly cmdName: string,
    private readonly cmdDescription: string = "",
    private readonly globalFlags: GlobalFlag[] = [],
  ) {}

  // --- Router authoring API ---

  use(...middlewares: Middleware[]): this {
    this.mws.push(...middlewares)
    return this
  }

  handler(handler: Handler): this {
    this.handlers.push(handler)
    return this
  }

  // --- Handler API: a router is itself a mountable branch node ---

  name(): string {
    return this.cmdName
  }

  description(): string {
    return this.cmdDescription
  }

  // A router's flags are group-level (global): declared here, inherited by every
  // descendant and exposed through the context.
  flags(): Flag[] {
    return this.globalFlags
  }

  // A group/branch never executes directly; it just hosts subcommands.
  async handle(_ctx: Context, _flags: any): Promise<void> {}

  children(): Handler[] {
    return this.handlers
  }

  // --- MiddlewareProvider: exposes this level's middleware to the walk ---

  middlewares(): Middleware[] {
    return this.mws
  }

  // --- Router execution ---

  async route(argv: string[], ctx: Context = ValueContext.EmptyContext()): Promise<void> {
    await compile(this, ctx).parseAsync(argv)
  }
}

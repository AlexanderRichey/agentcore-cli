import type { Flag, Handler } from "./handler"
import { type Middleware, type MiddlewareProvider, isMiddlewareProvider } from "./middleware"
import { type Context, ValueContext } from "./context"
import { parseFlags, toOption } from "./flags"

import { Command } from "commander"

export const COMMANDER_CTX = "COMMAND"

// declareFlags wires a node's zod-typed flags onto a Commander command. Each
// flag's option shape (value/toggle, variadic, required, default) is derived
// from its schema; see flags.ts/toOption.
function declareFlags(c: Command, flags: Flag[]): void {
  for (const flag of flags) {
    c.addOption(toOption(flag))
  }
}

// compile walks the Handler tree into a Commander Command tree.
//
// `stack` is the accumulated middleware declared by ancestors. A node's own
// middleware is appended before descending, so middleware applies *down* the
// tree. The stack is materialized only at leaves (branches never execute), and
// `reduceRight` makes ancestor middleware the outermost wrapper so it runs first.
export function compile(node: Handler, ctx: Context, stack: Middleware[] = []): Command {
  const c = new Command(node.name())
  c.description(node.description())

  const flags = node.flags()
  declareFlags(c, flags)

  const own = isMiddlewareProvider(node) ? node.middlewares() : []
  const nextStack = [...stack, ...own]

  const children = node.children()
  if (children.length > 0) {
    for (const child of children) {
      c.addCommand(compile(child, ctx, nextStack))
    }
  } else {
    // Middleware wraps the node here; the wrapper's logic runs at leaf execution.
    const wrapped = nextStack.reduceRight((h, mw) => mw(h), node)
    // Commander invokes the action as (...positionals, options, command). With no
    // positionals declared, the parsed options live on the command; we validate +
    // coerce them against their schemas, then hand the resulting typed-by-name
    // object to the (middleware-wrapped) handler.
    c.action(async (...actionArgs: unknown[]) => {
      const command = actionArgs[actionArgs.length - 1] as Command
      const parsed = parseFlags(flags, command.opts(), command)
      const newCtx = ctx.withValue(COMMANDER_CTX, command)
      await wrapped.handle(newCtx, parsed)
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
    private readonly cmdFlags: Flag[] = [],
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

  flags(): Flag[] {
    return this.cmdFlags
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

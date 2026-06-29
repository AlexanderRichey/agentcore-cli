import type { Handler } from "./handler"
import { type Middleware, type MiddlewareProvider, isMiddlewareProvider } from "./middleware"
import { type Context, ValueContext } from "./context"

import { Command } from "commander"

// compile walks the Handler tree into a Commander Command tree.
//
// `stack` is the accumulated middleware declared by ancestors. A node's own
// middleware is appended before descending, so middleware applies *down* the
// tree. The stack is materialized only at leaves (branches never execute), and
// `reduceRight` makes ancestor middleware the outermost wrapper so it runs first.
function compile(node: Handler, ctx: Context, stack: Middleware[] = []): Command {
  const c = new Command(node.name())
  c.description(node.description())

  // for (const [name, description] of Object.entries(node.arguments())) {
  //   c.argument(name, String(description)) // TODO: real Argument wiring
  // }
  // TODO: wire node.flags() via c.option(...)

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
    c.action((...args) => wrapped.handle(ctx, args))
  }

  return c
}

export class Router implements Handler, MiddlewareProvider {
  private mws: Middleware[] = []
  private handlers: Handler[] = []

  constructor(
    private readonly cmdName: string,
    private readonly cmdDescription: string = "",
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

  // flags(): Record<string, Flag> {
  //   return {}
  // }
  //
  // arguments(): Record<string, Argument> {
  //   return {}
  // }

  // A group/branch never executes directly; it just hosts subcommands.
  async handle(_ctx: Context, _args: any[]): Promise<void> {}

  children(): Handler[] {
    return this.handlers
  }

  // --- MiddlewareProvider: exposes this level's middleware to the walk ---

  middlewares(): Middleware[] {
    return this.mws
  }

  // --- Router execution ---

  route(argv: string[], ctx: Context = ValueContext.EmptyContext()): void {
    compile(this, ctx).parse(argv)
  }
}

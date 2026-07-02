import type { Argument, Flag, GlobalFlag, Handler } from "./handler";
import { type Middleware, type MiddlewareProvider, isMiddlewareProvider } from "./middleware";
import { type Context, type ContextKey, ValueContext, contextKey } from "./context";
import { applyGlobalFlags, parseFlags, toOption } from "./flags";
import { parseArguments, toCommanderArgument } from "./args";

import { Command } from "commander";

// CommandKey exposes the Commander Command for the executing leaf via context.
export const CommandKey: ContextKey<Command> = contextKey<Command>("commander.command");
// PathKey exposes the path to the executing leaf via context.
export const PathKey: ContextKey<string> = contextKey<string>("path");

// declareFlags wires a node's zod-typed flags onto a Commander command. Each
// flag's option shape (value/toggle, variadic, required, default) is derived
// from its schema; see flags.ts/toOption.
function declareFlags(c: Command, flags: Flag[]): void {
  for (const flag of flags) {
    c.addOption(toOption(flag));
  }
}

function declareArguments(c: Command, args: Argument[]): void {
  for (const arg of args) {
    c.addArgument(toCommanderArgument(arg));
  }
}

// globalFlagsOf recovers the GlobalFlags (which double as context keys) from a
// node's declared flags. Only group flags created via globalFlag() carry a key.
function globalFlagsOf(node: Handler): GlobalFlag[] {
  return node.flags().filter((f): f is GlobalFlag => "id" in f);
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
  const c = new Command(node.name());
  c.description(node.description());

  const ownFlags = node.flags();
  declareFlags(c, ownFlags);
  declareArguments(c, node.arguments());

  const own = isMiddlewareProvider(node) ? node.middlewares() : [];
  const nextStack = [...stack, ...own];

  const path = ctx.value(PathKey) || "";
  const newPath = `${path}/${node.name()}`;
  ctx = ctx.withValue(PathKey, newPath);

  const children = node.children();
  if (children.length > 0) {
    // attaching both children and subcommands leads to ambiguity.
    if (node.arguments().length > 0) {
      throw new Error(
        `Invalid command '${node.name()}' contains both subcommands and positional arguments.`,
      );
    }
    // A group's own global flags become inherited flags for everything beneath it.
    const childGlobals = [...inheritedGlobals, ...globalFlagsOf(node)];
    for (const child of children) {
      c.addCommand(compile(child, ctx, nextStack, childGlobals));
    }
  } else {
    // Middleware wraps the node here; the wrapper's logic runs at leaf execution.
    const wrapped = nextStack.reduceRight((h, mw) => mw(h), node);
    // `optsWithGlobals()` merges this command's options with all ancestors', so
    // group-level flags declared higher in the tree are visible here regardless
    // of where they appear on the command line.
    c.action(async (...actionArgs: unknown[]) => {
      const command = actionArgs[actionArgs.length - 1] as Command;
      const globals = command.optsWithGlobals();

      // Inherited group/global flags -> context (typed, read via ctx.value(key)).
      let leafCtx = ctx.withValue(CommandKey, command);
      leafCtx = applyGlobalFlags(inheritedGlobals, globals, command, leafCtx);

      // Own flags -> the statically-typed object passed to handle.
      const parsedFlags = parseFlags(ownFlags, globals, command);
      const parsedArguments = parseArguments(node.arguments(), command);

      await wrapped.handle(leafCtx, parsedFlags, parsedArguments);
    });
  }

  return c;
}

export class Router implements Handler, MiddlewareProvider {
  private mws: Middleware[] = [];
  private handlers: Handler[] = [];
  private globalFlags: GlobalFlag[] = [];

  constructor(
    private readonly cmdName: string,
    private readonly cmdDescription: string = "",
  ) {}

  // --- Router authoring API ---

  use(...middlewares: Middleware[]): this {
    this.mws.push(...middlewares);
    return this;
  }

  handler(handler: Handler): this {
    this.handlers.push(handler);
    return this;
  }

  groupFlags(...flags: GlobalFlag[]): this {
    this.globalFlags.push(...flags);
    return this;
  }

  // --- Handler API: a router is itself a mountable branch node ---

  name(): string {
    return this.cmdName;
  }

  description(): string {
    return this.cmdDescription;
  }

  // A router's flags are group-level (global): declared here, inherited by every
  // descendant and exposed through the context.
  flags(): Flag[] {
    return this.globalFlags;
  }

  // global arguments are not supported.
  arguments(): Argument[] {
    return [];
  }

  // A group/branch never executes directly; it just hosts subcommands.
  async handle(_ctx: Context, _flags: any, _args: any): Promise<void> {}

  children(): Handler[] {
    return this.handlers;
  }

  // --- MiddlewareProvider: exposes this level's middleware to the walk ---

  middlewares(): Middleware[] {
    return this.mws;
  }

  // --- Router execution ---

  async route(argv: string[], ctx: Context = ValueContext.EmptyContext()): Promise<void> {
    await compile(this, ctx).parseAsync(argv);
  }
}

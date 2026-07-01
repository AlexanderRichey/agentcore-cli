import { test, expect } from "bun:test";
import { Command } from "commander";
import z from "zod";

import {
  Router,
  ValueContext,
  argument,
  compile,
  contextKey,
  createHandler,
  flag,
  globalFlag,
  type Context,
  type Handler,
  type Middleware,
} from "./index";

// --- helpers ---------------------------------------------------------------

// record is a test middleware that appends `label` to `log` when the node it
// wraps is executed, then delegates. It passes everything else through.
function record(log: string[], label: string): Middleware {
  return (h) => ({
    name: () => h.name(),
    description: () => h.description(),
    flags: () => h.flags(),
    arguments: () => h.arguments(),
    children: () => h.children(),
    handle: async (ctx: Context, flags: any, args: any) => {
      log.push(label);
      await h.handle(ctx, flags, args);
    },
  });
}

function leaf(name: string, onHandle: () => void): Handler {
  return createHandler({
    name,
    description: "",
    handle: async () => onHandle(),
  });
}

// exitOverrideAll makes every command in the tree throw (instead of calling
// process.exit) and swallows its output, so validation failures are testable.
function exitOverrideAll(cmd: Command): Command {
  cmd.exitOverride();
  cmd.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  cmd.commands.forEach(exitOverrideAll);
  return cmd;
}

// --- middleware ------------------------------------------------------------

test("middleware accumulates down the tree and wraps the leaf in ancestor-first order", async () => {
  const log: string[] = [];

  const greet = new Router("greet").use(record(log, "greet"));
  greet.handler(leaf("hi", () => log.push("handle")));

  const root = new Router("app").use(record(log, "root"));
  root.handler(greet);

  await root.route(["node", "app", "greet", "hi"]);

  // root (outermost) runs first, then greet, then the leaf handle.
  expect(log).toEqual(["root", "greet", "handle"]);
});

test("middleware applies only to the subtree where it is declared", async () => {
  const log: string[] = [];

  const greet = new Router("greet").use(record(log, "greet"));
  greet.handler(leaf("hi", () => log.push("hi-handle")));

  const root = new Router("app").use(record(log, "root"));
  root.handler(greet);
  root.handler(leaf("top", () => log.push("top-handle"))); // sibling of greet

  await root.route(["node", "app", "top"]);

  expect(log).toEqual(["root", "top-handle"]);
});

// --- flags: typing + validation + coercion ---------------------------------

test("validates and passes a typed-by-name object to handle", async () => {
  let seen: { "harness-id": string } | undefined;

  const get = createHandler({
    name: "get",
    description: "",
    flags: [flag("harness-id", "id", z.string().max(5))],
    handle: async (_ctx, flags) => {
      seen = flags; // flags is typed { "harness-id": string }
    },
  });

  const root = new Router("app");
  root.handler(get);

  await root.route(["node", "app", "get", "--harness-id", "abc"]);

  expect(seen).toEqual({ "harness-id": "abc" });
});

test("auto-coerces raw string flag values to the schema's type", async () => {
  let seen: { count: number; verbose: boolean } | undefined;

  const add = createHandler({
    name: "add",
    description: "",
    flags: [flag("count", "n", z.number().int()), flag("verbose", "v", z.boolean())],
    handle: async (_ctx, flags) => {
      seen = flags; // { count: number; verbose: boolean }
    },
  });

  const root = new Router("app");
  root.handler(add);

  await root.route(["node", "app", "add", "--count", "42", "--verbose"]);

  expect(seen).toEqual({ count: 42, verbose: true });
});

test("boolean flags default to false when omitted", async () => {
  let seen: { verbose: boolean } | undefined;

  const run = createHandler({
    name: "run",
    description: "",
    flags: [flag("verbose", "v", z.boolean())],
    handle: async (_ctx, flags) => {
      seen = flags;
    },
  });

  const root = new Router("app");
  root.handler(run);

  await root.route(["node", "app", "run"]);

  expect(seen).toEqual({ verbose: false });
});

test("applies a schema default for an omitted flag", async () => {
  let seen: { count: number } | undefined;

  const opt = createHandler({
    name: "opt",
    description: "",
    flags: [flag("count", "n", z.coerce.number().default(7))],
    handle: async (_ctx, flags) => {
      seen = flags;
    },
  });

  const root = new Router("app");
  root.handler(opt);

  await root.route(["node", "app", "opt"]);

  expect(seen).toEqual({ count: 7 });
});

test("reports invalid input via command.error (throws under exitOverride)", async () => {
  const get = createHandler({
    name: "get",
    description: "",
    flags: [flag("harness-id", "id", z.string().max(3))],
    handle: async () => {
      throw new Error("handle should not run on invalid input");
    },
  });

  const root = new Router("app");
  root.handler(get);

  const cmd = exitOverrideAll(compile(root, ValueContext.EmptyContext()));

  await expect(
    cmd.parseAsync(["node", "app", "get", "--harness-id", "toolong"]), // exceeds max(3)
  ).rejects.toThrow(/Invalid value for option '--harness-id'/);
});

test("a required (non-optional) flag is mandatory", async () => {
  const get = createHandler({
    name: "get",
    description: "",
    flags: [flag("harness-id", "id", z.string())],
    handle: async () => {},
  });

  const root = new Router("app");
  root.handler(get);

  const cmd = exitOverrideAll(compile(root, ValueContext.EmptyContext()));

  // Omitting the mandatory option makes Commander reject before the handler runs.
  await expect(cmd.parseAsync(["node", "app", "get"])).rejects.toThrow();
});

// --- flag inheritance (group-level / global flags) -------------------------

test("a group-level flag is validated and exposed to descendants via typed context key", async () => {
  const RegionKey = globalFlag("region", "AWS region", z.string().default("us-east-1"));
  let region: string | undefined;
  let ownFlags: { id: string } | undefined;

  const get = createHandler({
    name: "get",
    description: "",
    flags: [flag("id", "id", z.string())],
    handle: async (ctx, flags) => {
      region = ctx.value(RegionKey); // typed string | undefined
      ownFlags = flags; // only the leaf's own flags
    },
  });

  // RegionKey declared as a global flag on the root group; `--id` on the leaf.
  const root = new Router("app", "", [RegionKey]);
  const harness = new Router("harness");
  harness.handler(get);
  root.handler(harness);

  await root.route(["node", "app", "harness", "get", "--id", "x", "--region", "us-west-2"]);

  expect(region).toBe("us-west-2");
  expect(ownFlags).toEqual({ id: "x" }); // inherited flag is NOT in the typed object
});

test("a group-level flag falls back to its schema default when omitted", async () => {
  const RegionKey = globalFlag("region", "AWS region", z.string().default("us-east-1"));
  let region: string | undefined;

  const get = createHandler({
    name: "get",
    description: "",
    handle: async (ctx) => {
      region = ctx.value(RegionKey);
    },
  });

  const root = new Router("app", "", [RegionKey]);
  root.handler(get);

  await root.route(["node", "app", "get"]);

  expect(region).toBe("us-east-1");
});

test("an invalid group-level flag is reported via command.error", async () => {
  const LevelKey = globalFlag("level", "log level", z.enum(["debug", "info"]));

  const get = createHandler({
    name: "get",
    description: "",
    handle: async () => {
      throw new Error("handle should not run on invalid input");
    },
  });

  const root = new Router("app", "", [LevelKey]);
  root.handler(get);

  const cmd = exitOverrideAll(compile(root, ValueContext.EmptyContext()));

  await expect(cmd.parseAsync(["node", "app", "get", "--level", "nope"])).rejects.toThrow(
    /Invalid value for option '--level'/,
  );
});

test("ContextKey identity is by symbol, not name", () => {
  const a = contextKey<string>("dup");
  const b = contextKey<number>("dup"); // same name, distinct key
  const ctx = ValueContext.EmptyContext().withValue(a, "x").withValue(b, 7);

  expect(ctx.value(a)).toBe("x");
  expect(ctx.value(b)).toBe(7);
});

test("context.require throws when a key is absent", () => {
  const Missing = contextKey<string>("missing");
  expect(() => ValueContext.EmptyContext().require(Missing)).toThrow(/missing a required value/);
});

test("compile rejects a handler with both subcommands and positional arguments", () => {
  const child = createHandler({
    name: "child",
    description: "",
    handle: async () => {},
  });

  // A parent that has both a child handler and positional arguments is invalid.
  const parent = createHandler({
    name: "parent",
    description: "",
    arguments: [argument("id", "an id", z.string())],
    children: [child],
    handle: async () => {},
  });

  const root = new Router("app");
  root.handler(parent);

  expect(() => compile(root, ValueContext.EmptyContext())).toThrow(
    /contains both subcommands and positional arguments/,
  );
});

// --- positional arguments: typing + validation + coercion --------------------

test("validates, coerces, and passes typed positional arguments to handle", async () => {
  let seen: { name: string; port: number; verbose: boolean } | undefined;

  const serve = createHandler({
    name: "serve",
    description: "",
    arguments: [
      argument("name", "service name", z.string()),
      argument("port", "port number", z.coerce.number()),
      argument("verbose", "enable verbose mode", z.coerce.boolean()),
    ],
    handle: async (_ctx, _flags, args) => {
      seen = args;
    },
  });

  const root = new Router("app");
  root.handler(serve);

  await root.route(["node", "app", "serve", "api", "8080", "true"]);

  expect(seen).toEqual({ name: "api", port: 8080, verbose: true });
});

test("optional arguments resolve to undefined when omitted", async () => {
  let seen: { key: string | undefined } | undefined;

  const config = createHandler({
    name: "config",
    description: "",
    arguments: [argument("key", "config key", z.string().optional())],
    handle: async (_ctx, _flags, args) => {
      seen = args;
    },
  });

  const root = new Router("app");
  root.handler(config);

  await root.route(["node", "app", "config"]);

  expect(seen).toEqual({ key: undefined });
});

test("arguments with schema defaults use the default when omitted", async () => {
  let seen: { env: string } | undefined;

  const deploy = createHandler({
    name: "deploy",
    description: "",
    arguments: [argument("env", "target environment", z.string().default("prod"))],
    handle: async (_ctx, _flags, args) => {
      seen = args;
    },
  });

  const root = new Router("app");
  root.handler(deploy);

  await root.route(["node", "app", "deploy"]);

  expect(seen).toEqual({ env: "prod" });
});

test("variadic argument collects multiple values into an array", async () => {
  let seen: { files: string[] } | undefined;

  const lint = createHandler({
    name: "lint",
    description: "",
    arguments: [argument("files", "files to lint", z.array(z.string()))],
    handle: async (_ctx, _flags, args) => {
      seen = args;
    },
  });

  const root = new Router("app");
  root.handler(lint);

  await root.route(["node", "app", "lint", "a.ts", "b.ts", "c.ts"]);

  expect(seen).toEqual({ files: ["a.ts", "b.ts", "c.ts"] });
});

test("a required positional argument is mandatory", async () => {
  const get = createHandler({
    name: "get",
    description: "",
    arguments: [argument("id", "resource id", z.string())],
    handle: async () => {},
  });

  const root = new Router("app");
  root.handler(get);

  const cmd = exitOverrideAll(compile(root, ValueContext.EmptyContext()));

  await expect(cmd.parseAsync(["node", "app", "get"])).rejects.toThrow();
});

test("rejects an argument that fails schema validation", async () => {
  const config = createHandler({
    name: "config",
    description: "",
    arguments: [argument("key", "config key", z.string().max(3))],
    handle: async () => {
      throw new Error("handle should not run on invalid input");
    },
  });

  const root = new Router("app");
  root.handler(config);

  const cmd = exitOverrideAll(compile(root, ValueContext.EmptyContext()));

  await expect(cmd.parseAsync(["node", "app", "config", "toolong"])).rejects.toThrow(
    /Invalid value for argument 'key'/,
  );
});

test("compile rejects a variadic argument that is not the last positional", () => {
  const handler = createHandler({
    name: "cp",
    description: "",
    arguments: [
      argument("files", "source files", z.array(z.string())),
      argument("dest", "destination", z.string()),
    ],
    handle: async () => {},
  });

  const root = new Router("app");
  root.handler(handler);

  expect(() => compile(root, ValueContext.EmptyContext())).toThrow(
    /only the last argument can be variadic/,
  );
});

// --- flags + arguments together ----------------------------------------------

test("handler receives both flags and arguments separately", async () => {
  let seenFlags: { format: string } | undefined;
  let seenArgs: { key: string; value: string } | undefined;

  const set = createHandler({
    name: "set",
    description: "",
    flags: [flag("format", "output format", z.string())],
    arguments: [
      argument("key", "config key", z.string()),
      argument("value", "config value", z.string()),
    ],
    handle: async (_ctx, flags, args) => {
      seenFlags = flags;
      seenArgs = args;
    },
  });

  const root = new Router("app");
  root.handler(set);

  await root.route(["node", "app", "set", "--format", "json", "region", "us-west-2"]);

  expect(seenFlags).toEqual({ format: "json" });
  expect(seenArgs).toEqual({ key: "region", value: "us-west-2" });
});

test("handler with overlapping flag and arg names works independently", async () => {
  let seenFlags: { id: string } | undefined;
  let seenArgs: { id: string } | undefined;

  const get = createHandler({
    name: "get",
    description: "",
    flags: [flag("id", "flag id", z.string())],
    arguments: [argument("id", "arg id", z.string())],
    handle: async (_ctx, flags, args) => {
      seenFlags = flags;
      seenArgs = args;
    },
  });

  const root = new Router("app");
  root.handler(get);

  await root.route(["node", "app", "get", "--id", "flag-value", "arg-value"]);

  expect(seenFlags).toEqual({ id: "flag-value" });
  expect(seenArgs).toEqual({ id: "arg-value" });
});

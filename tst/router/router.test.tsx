import { test, expect } from "bun:test";
import { Command } from "commander";
import z from "zod";

import {
  Router,
  ValueContext,
  compile,
  createHandler,
  flag,
  type Context,
  type Handler,
  type Middleware
} from "../../src/router";

// --- helpers ---------------------------------------------------------------

// record is a test middleware that appends `label` to `log` when the node it
// wraps is executed, then delegates. It passes everything else through.
function record(log: string[], label: string): Middleware {
  return (h) => ({
    name: () => h.name(),
    description: () => h.description(),
    flags: () => h.flags(),
    children: () => h.children(),
    handle: async (ctx: Context, flags: any) => {
      log.push(label);
      await h.handle(ctx, flags);
    }
  });
}

function leaf(name: string, onHandle: () => void): Handler {
  return createHandler({
    name,
    description: "",
    handle: async () => onHandle()
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
    }
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
    }
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
    }
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
    }
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
    }
  });

  const root = new Router("app");
  root.handler(get);

  const cmd = exitOverrideAll(compile(root, ValueContext.EmptyContext()));

  await expect(
    cmd.parseAsync(["node", "app", "get", "--harness-id", "toolong"]) // exceeds max(3)
  ).rejects.toThrow(/Invalid value for option '--harness-id'/);
});

test("a required (non-optional) flag is mandatory", async () => {
  const get = createHandler({
    name: "get",
    description: "",
    flags: [flag("harness-id", "id", z.string())],
    handle: async () => {}
  });

  const root = new Router("app");
  root.handler(get);

  const cmd = exitOverrideAll(compile(root, ValueContext.EmptyContext()));

  // Omitting the mandatory option makes Commander reject before the handler runs.
  await expect(cmd.parseAsync(["node", "app", "get"])).rejects.toThrow();
});

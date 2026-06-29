import { test, expect } from "bun:test";

import {
  AppRouter,
  ValueContext,
  compile,
  type Context,
  type Handler,
  type Middleware
} from "../../src/app/index.tsx";

// record is a test middleware that appends `label` to `log` when the node it
// wraps is executed, then delegates. It passes everything else through.
function record(log: string[], label: string): Middleware {
  return (h) => ({
    name: () => h.name(),
    description: () => h.description(),
    flags: () => h.flags(),
    arguments: () => h.arguments(),
    children: () => h.children(),
    handle: (ctx: Context, args: any[]) => {
      log.push(label);
      h.handle(ctx, args);
    }
  });
}

function leaf(name: string, onHandle: () => void): Handler {
  return {
    name: () => name,
    description: () => "",
    flags: () => ({}),
    arguments: () => ({}),
    children: () => [],
    handle: () => onHandle()
  };
}

test("middleware accumulates down the tree and wraps the leaf in ancestor-first order", () => {
  const log: string[] = [];

  const greet = new AppRouter("greet").use(record(log, "greet"));
  greet.handler(leaf("hi", () => log.push("handle")));

  const root = new AppRouter("app").use(record(log, "root"));
  root.handler(greet);

  compile(root, ValueContext.EmptyContext()).parse(["node", "app", "greet", "hi"]);

  // root (outermost) runs first, then greet, then the leaf handle.
  expect(log).toEqual(["root", "greet", "handle"]);
});

test("middleware applies only to the subtree where it is declared", () => {
  const log: string[] = [];

  const greet = new AppRouter("greet").use(record(log, "greet"));
  greet.handler(leaf("hi", () => log.push("hi-handle")));

  const root = new AppRouter("app").use(record(log, "root"));
  root.handler(greet);
  root.handler(leaf("top", () => log.push("top-handle"))); // sibling of greet

  // Running the top-level leaf must NOT pick up greet's middleware.
  compile(root, ValueContext.EmptyContext()).parse(["node", "app", "top"]);

  expect(log).toEqual(["root", "top-handle"]);
});

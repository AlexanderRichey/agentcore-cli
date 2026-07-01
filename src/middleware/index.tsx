import { type ContextKey, type Middleware } from "../router";

// withLogging is a sample middleware: it wraps a node and prints when (and only
// when) that node is executed as a leaf.
export function withLogging(label: string): Middleware {
  return (h) => ({
    name: () => h.name(),
    description: () => h.description(),
    flags: () => h.flags(),
    children: () => h.children(),
    handle: async (ctx, flags) => {
      console.log(`[${label}]`);
      await h.handle(ctx, flags);
    },
  });
}

// provide is a sample middleware: it stores a typed value on the context under
// `key` before delegating, so downstream handlers can read it via ctx.value(key).
export function provide<V>(key: ContextKey<V>, value: V): Middleware {
  return (h) => ({
    name: () => h.name(),
    description: () => h.description(),
    flags: () => h.flags(),
    children: () => h.children(),
    handle: async (ctx, flags) => {
      await h.handle(ctx.withValue(key, value), flags);
    },
  });
}

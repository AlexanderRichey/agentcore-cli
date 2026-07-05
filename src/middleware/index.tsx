import { renderTui } from "../components";
import { JsonKey } from "../handlers/keys";
import type { Core } from "../handlers/types";
import { type Middleware } from "../router";

// withLogging is a sample middleware: it wraps a node and prints when (and only
// when) that node is executed as a leaf.
export function withLogging(label: string): Middleware {
  return (h) => ({
    name: () => h.name(),
    description: () => h.description(),
    flags: () => h.flags(),
    arguments: () => h.arguments(),
    children: () => h.children(),
    handle: async (ctx, flags, args) => {
      console.log(`[${label}]`);
      await h.handle(ctx, flags, args);
    },
  });
}

const countPassedValues = (obj: Object) =>
  Object.entries(obj).reduce((acc, [key, val]) => {
    if (val !== undefined) {
      acc += 1;
    }

    return acc;
  }, 0);

export function withTuiOnEmptyFlagsAndArgs(core: Core): Middleware {
  const boundRenderTui = renderTui(core);

  return (h) => ({
    name: () => h.name(),
    description: () => h.description(),
    flags: () => h.flags(),
    arguments: () => h.arguments(),
    children: () => h.children(),
    handle: async (ctx, flags, args) => {
      if (
        !ctx.require(JsonKey) &&
        countPassedValues(flags) === 0 &&
        countPassedValues(args) === 0
      ) {
        await boundRenderTui(ctx, flags, args);
        return;
      } else {
        await h.handle(ctx, flags, args);
      }
    },
  });
}

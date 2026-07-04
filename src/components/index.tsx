import React from "react";
import { render } from "ink";
import { Root } from "./Root";
import { type DefaultHandle, PathKey, type Middleware } from "../router";
import type { Core } from "../handlers/types";
import { JsonKey } from "../handlers/keys";

// renderTui builds the root DefaultHandle that mounts the Ink React tree. It
// reads the command path from the context and passes it, along with the injected
// `core` clients, into the Root component. The handler resolves once the Ink app
// exits (e.g. the user quits or the component unmounts), keeping the CLI process
// alive while the TUI is running.
export function renderTui(core: Core): DefaultHandle {
  return async (ctx) => {
    const path = ctx.require(PathKey);
    const { waitUntilExit } = render(<Root path={path} core={core} />);
    await waitUntilExit();
  };
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

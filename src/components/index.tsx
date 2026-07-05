import React from "react";
import { render } from "ink";
import { Root } from "./Root";
import { type DefaultHandle, PathKey, CommandKey } from "../router";
import type { Core } from "../handlers/types";
import { JsonKey } from "../handlers/keys";

// renderTui builds the root DefaultHandle that mounts the Ink React tree. It
// reads the command path from the context and passes it, along with the injected
// `core` clients, into the Root component. The handler resolves once the Ink app
// exits (e.g. the user quits or the component unmounts), keeping the CLI process
// alive while the TUI is running. If JSON mode is enabled, it prints help text
// and returns.
export function renderTui(core: Core): DefaultHandle {
  return async (ctx) => {
    if (ctx.require(JsonKey)) {
      const c = ctx.require(CommandKey);
      return c.outputHelp();
    }

    const path = ctx.require(PathKey);
    const { waitUntilExit } = render(<Root path={path} core={core} />);
    await waitUntilExit();
  };
}

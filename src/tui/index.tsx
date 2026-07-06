import React from "react";
import { render } from "ink";
import { Root } from "../components/Root";
import { type DefaultHandle, PathKey, CommandKey } from "../router";
import type { Core } from "../handlers/types";
import { JsonKey } from "../handlers/keys";

// renderJson pretty-prints a value as indented JSON to stdout. It is the output
// counterpart to renderTui: handlers call it to emit machine-readable results
// (e.g. when --json is set) rather than rendering the interactive TUI.
export function renderJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

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
    // alternateScreen switches the terminal to its alternate buffer so the TUI
    // takes over the screen and the prior scrollback is restored on exit (like Vim).
    const { waitUntilExit } = render(<Root path={path} ctx={ctx} core={core} />, {
      alternateScreen: true,
    });
    await waitUntilExit();
  };
}

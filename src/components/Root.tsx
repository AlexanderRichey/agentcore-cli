import React from "react";
import { Text } from "ink";
import type { Core } from "../handlers/types.tsx";

export interface RootProps {
  // path is the command path to the executing node (e.g. "/agentcore").
  path: string;
  // core carries the injected service clients for use by the TUI.
  core: Core;
}

// Root is the top of the Ink React tree, rendered by the `agentcore` default
// handler when the CLI is invoked without a subcommand.
export function Root({ path }: RootProps) {
  return <Text>Hello world ({path})</Text>;
}

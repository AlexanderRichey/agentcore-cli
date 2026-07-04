import { Router } from "../router";
import { createHarnessHandler } from "./harness/index.tsx";
import { DebugKey, EndpointKey, JsonKey, RegionKey } from "./keys.tsx";
import { createConfigHandler } from "./config/";
import { renderTui } from "../components/index.tsx";
import type { Core } from "./types.tsx";

export function createRootHandler(core: Core): Router {
  const root = new Router("agentcore", "Do fun things with AgentCore");

  // Add global flags
  root.groupFlags(RegionKey, DebugKey, JsonKey, EndpointKey);

  // Install sub handlers
  root.handler(createHarnessHandler(core));
  root.handler(createConfigHandler());

  // Invoking with no subcommand launches the interactive TUI.
  root.default(renderTui(core));

  return root;
}

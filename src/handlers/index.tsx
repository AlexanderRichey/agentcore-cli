import { Router } from "../router";
import { createHarnessHandler } from "./harness/index.tsx";
import { RegionKey } from "./keys.tsx";
import type { CoreHarnessClient } from "./harness/types.tsx";
import { createConfigHandler } from "./config/";

export interface Core {
  harness: CoreHarnessClient;
}

export function createRootHandler(core: Core): Router {
  // RegionKey is a group-level (global) flag: declared on the root, it is
  // validated once and made available to every subcommand via ctx.value(RegionKey).
  const root = new Router("agentcore", "Do fun things with AgentCore", [RegionKey]);

  root.handler(createHarnessHandler(core.harness));
  root.handler(createConfigHandler());

  return root;
}

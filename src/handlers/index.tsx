import { Router } from "../router";
import { createHarnessHandler } from "./harness/index.tsx";
import { DebugKey, EndpointKey, JsonKey, RegionKey } from "./keys.tsx";
import type { CoreHarnessClient } from "./harness/types.tsx";
import { createConfigHandler } from "./config/";

export interface Core {
  harness: CoreHarnessClient;
}

export function createRootHandler(core: Core): Router {
  const root = new Router("agentcore", "Do fun things with AgentCore");

  // Add global flags
  root.groupFlags(RegionKey, DebugKey, JsonKey, EndpointKey);

  // Install sub handlers
  root.handler(createHarnessHandler(core.harness));
  root.handler(createConfigHandler());

  return root;
}

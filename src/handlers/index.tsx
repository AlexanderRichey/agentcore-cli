import { Router } from "../router";
import { createHarnessHandler } from "./harness/index.tsx";
import { DebugKey, EndpointKey, JsonKey, RegionKey } from "./keys.tsx";
import type { CoreHarnessClient } from "./harness/types.tsx";

export interface Core {
  harness: CoreHarnessClient;
}

export function createRootHandler(core: Core): Router {
  const root = new Router("agentcore", "Do fun things with AgentCore", [
    RegionKey,
    DebugKey,
    JsonKey,
    EndpointKey,
  ]);

  root.handler(createHarnessHandler(core.harness));

  return root;
}

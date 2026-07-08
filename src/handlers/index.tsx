import { Router } from "../router";
import { createHarnessHandler } from "./harness/index.tsx";
import { DebugKey, EndpointKey, JsonKey, RegionKey } from "./keys.tsx";
import { createConfigHandler } from "./config/";
import { renderTui } from "../tui";
import { withRegion, withJsonRenderer } from "../middleware";
import type { AppIO, Core } from "./types.tsx";
import { createProjectHandler } from "./project/";

export function createRootHandler(core: Core, io: AppIO): Router {
  const root = new Router("agentcore", "the platform for production AI agents");

  // Add global flags
  root.groupFlags(RegionKey, DebugKey, JsonKey, EndpointKey);

  // Resolve the effective AWS region (flag -> env -> config file) and pin it on
  // the context for every command beneath the root.
  root.use(withRegion());

  // Pin a JSON renderer wired to the configured stdout so leaf handlers can emit
  // machine-readable output without touching the process streams directly.
  root.use(withJsonRenderer(io));

  // Install sub handlers
  root.handler(createHarnessHandler(core, io));
  root.handler(createConfigHandler(io));
  root.handler(createProjectHandler(core, io));

  // Invoking with no subcommand launches the interactive TUI.
  root.default(renderTui(core, io));

  return root;
}

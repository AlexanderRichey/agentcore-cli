import { renderTui } from "../../tui";
import { withTuiOnEmptyFlagsAndArgs } from "../../middleware";
import { Router } from "../../router";
import type { AppIO, Core } from "../types";
import { createGetHarnessHandler } from "./get";
import { createListHarnessHandler } from "./list";
import { createCreateHarnessHandler } from "./create";
import { createUpdateHarnessHandler } from "./update";
import { createDeleteHarnessHandler } from "./delete";
import { createInvokeHarnessHandler } from "./invoke";
import { createExecHarnessHandler } from "./exec";
import { createCreateEndpointHandler } from "./create-endpoint";
import { createGetEndpointHandler } from "./get-endpoint";
import { createListEndpointsHandler } from "./list-endpoints";
import { createUpdateEndpointHandler } from "./update-endpoint";
import { createDeleteEndpointHandler } from "./delete-endpoint";
import { createGetVersionsHandler } from "./get-versions";
import { createListVersionsHandler } from "./list-versions";

export function createHarnessHandler(core: Core, io: AppIO): Router {
  const harness = new Router("harness", "manage agentcore harnesses");

  // Open the TUI by default if no flags or arguments are passed
  harness.use(withTuiOnEmptyFlagsAndArgs(core, io));
  // Open the TUI at this root, i.e., `agentcore harness`
  harness.default(renderTui(core, io));

  // Register handlers
  harness.handler(createGetHarnessHandler(core));
  harness.handler(createListHarnessHandler(core));
  harness.handler(createCreateHarnessHandler(core));
  harness.handler(createUpdateHarnessHandler(core));
  harness.handler(createDeleteHarnessHandler(core));
  harness.handler(createInvokeHarnessHandler(core));
  harness.handler(createExecHarnessHandler(core));
  harness.handler(createCreateEndpointHandler(core));
  harness.handler(createGetEndpointHandler(core));
  harness.handler(createListEndpointsHandler(core));
  harness.handler(createUpdateEndpointHandler(core));
  harness.handler(createDeleteEndpointHandler(core));
  harness.handler(createGetVersionsHandler(core));
  harness.handler(createListVersionsHandler(core));

  return harness;
}

export { HarnessScreen } from "./screen.tsx";

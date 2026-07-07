import { renderTui } from "../../tui";
import { withTuiOnEmptyFlagsAndArgs } from "../../middleware";
import { Router } from "../../router";
import type { Core } from "../types";
import { createGetHarnessHandler } from "./get";
import { createListHarnessHandler } from "./list";
import { createCreateHarnessHandler } from "./create";
import { createUpdateHarnessHandler } from "./update";
import { createDeleteHarnessHandler } from "./delete";
import { createInvokeHarnessHandler } from "./invoke";
import { createExecHarnessHandler } from "./exec";

export function createHarnessHandler(core: Core): Router {
  const harness = new Router("harness", "manage agentcore harnesses");

  // Open the TUI by default if no flags or arguments are passed
  harness.use(withTuiOnEmptyFlagsAndArgs(core));
  // Open the TUI at this root, i.e., `agentcore harness`
  harness.default(renderTui(core));

  // Register handlers
  harness.handler(createGetHarnessHandler(core));
  harness.handler(createListHarnessHandler(core));
  harness.handler(createCreateHarnessHandler(core));
  harness.handler(createUpdateHarnessHandler(core));
  harness.handler(createDeleteHarnessHandler(core));
  harness.handler(createInvokeHarnessHandler(core));
  harness.handler(createExecHarnessHandler(core));

  return harness;
}

export { HarnessScreen } from "./screen.tsx";

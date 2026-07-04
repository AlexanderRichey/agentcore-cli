import { renderTui, withTuiOnEmptyFlagsAndArgs } from "../../components";
import { Router } from "../../router";
import type { Core } from "../types";
import { createGetHarnessHandler } from "./get";
import { createListHarnessHandler } from "./list";

export function createHarnessHandler(core: Core): Router {
  const harness = new Router("harness", "Manage AgentCore harnesses");

  // Open the TUI by default if no flags or arguments are passed
  harness.use(withTuiOnEmptyFlagsAndArgs(core));
  // Open the TUI at this root, i.e., `agentcore harness`
  harness.default(renderTui(core));

  // Register handlers
  harness.handler(createGetHarnessHandler(core));
  harness.handler(createListHarnessHandler(core));

  return harness;
}

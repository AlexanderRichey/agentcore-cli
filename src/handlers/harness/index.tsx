import { Router } from "../../router";
import { createGetHarnessHandler } from "./get";
import { createListHarnessHandler } from "./list";
import type { CoreHarnessClient } from "./types";

export function createHarnessHandler(core: CoreHarnessClient): Router {
  const harness = new Router("harness", "Manage AgentCore harnesses");

  harness.handler(createGetHarnessHandler(core));
  harness.handler(createListHarnessHandler(core));

  return harness;
}

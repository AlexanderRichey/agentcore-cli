import { Router } from "../../router"
import { createGetHarnessHandler } from "./get"
import { createListHarnessHandler } from "./list"
import type { coreHarnessClient } from "./types"

export function createHarnessHandler(core: coreHarnessClient): Router {
  const harness = new Router("harness", "Manage AgentCore harnesses")

  harness.handler(createGetHarnessHandler(core))
  harness.handler(createListHarnessHandler(core))

  return harness
}

import { Router } from "../router";
import { createHarnessHandler } from "./harness";

export function createRootHandler(): Router {
  const root = new Router("agentcore", "Do fun things with AgentCore")

  root.handler(createHarnessHandler())

  return root
}


import { Router } from "../../../router";
import type { AppIO, Core } from "../../types";
import { createAddAgentHandler } from "./agent";

export function createAddHandler(core: Core, io: AppIO): Router {
  const add = new Router("add", "add a resource to the project");

  add.handler(createAddAgentHandler(core, io));

  return add;
}

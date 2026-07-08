import { Router } from "../../../router";
import type { AppIO, Core } from "../../types";
import { createRemoveAgentHandler } from "./agent";

export function createRemoveHandler(core: Core, io: AppIO): Router {
  const remove = new Router("remove", "remove a resource from the project");

  remove.handler(createRemoveAgentHandler(core, io));

  return remove;
}

import { Router } from "../../router";
import { withProject, withAccount } from "../../middleware";
import type { AppIO, Core } from "../types";
import { createAddHandler } from "./add";
import { createRemoveHandler } from "./remove";
import { createCreateProjectHandler } from "./create";

export function createProjectHandler(core: Core, io: AppIO): Router {
  const project = new Router("project", "manage agentcore projects");
  const wp = withProject(core.projectAccessor);

  // create does not need withProject — it produces a project.
  const create = createCreateProjectHandler(core, io);
  project.handler(withAccount(core)(create));

  const add = createAddHandler(core, io);
  add.use(wp);
  project.handler(add);

  const remove = createRemoveHandler(core, io);
  remove.use(wp);
  project.handler(remove);

  return project;
}

export { ProjectScreen } from "./screen.tsx";

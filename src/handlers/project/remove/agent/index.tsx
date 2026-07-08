import z from "zod";
import { createHandler, flag } from "../../../../router";
import type { AppIO, Core } from "../../../types";
import { ProjectKey } from "../../../keys";
import { ResourceType } from "../../types";

export const createRemoveAgentHandler = (_core: Core, io: AppIO) =>
  createHandler({
    name: "agent",
    description: "remove an agent from the project",
    flags: [flag("name", "name of the agent", z.string())],
    handle: async (ctx, flags) => {
      const project = ctx.require(ProjectKey);
      await project.remove({ resource: ResourceType.Agent, name: flags.name });
      io.stdout.write(`Removed agent '${flags.name}' from project '${project.name}'\n`);
    },
  });

export { RemoveAgentScreen } from "./screen.tsx";

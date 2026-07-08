import z from "zod";
import { createHandler, flag } from "../../../../router";
import type { AppIO, Core } from "../../../types";
import { ProjectKey } from "../../../keys";
import { ResourceType } from "../../types";

export const createAddAgentHandler = (_core: Core, io: AppIO) =>
  createHandler({
    name: "agent",
    description: "add an agent to the project",
    flags: [flag("name", "name of the agent", z.string())],
    handle: async (ctx, flags) => {
      const project = ctx.require(ProjectKey);
      await project.add({ resource: ResourceType.Agent, name: flags.name });
      io.stdout.write(`Added agent '${flags.name}' to project '${project.name}'\n`);
    },
  });

export { AddAgentScreen } from "./screen.tsx";

import z from "zod";
import { createHandler, flag } from "../../../router";
import type { AppIO, Core } from "../../types";
import { AccountKey, RegionKey } from "../../keys";

export const createCreateProjectHandler = (core: Core, io: AppIO) =>
  createHandler({
    name: "create",
    description: "create a new agentcore project",
    flags: [
      flag("name", "name of the project to create", z.string()),
      flag("project-path", "directory to create the project in", z.string().optional()),
    ],
    handle: async (ctx, flags) => {
      io.stdout.write(`Creating project...\n`);
      const project = await core.projectAccessor.create({
        projectName: flags.name,
        path: flags["project-path"],
        region: ctx.require(RegionKey),
        account: ctx.value(AccountKey),
      });
      io.stdout.write(`Created project with name ${project.name}\n`);
      io.stdout.write(` run 'cd ${project.name}' to see the new project`);
    },
  });

export { CreateProjectScreen } from "./screen.tsx";

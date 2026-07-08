import type { Middleware } from "../router";
import type { ProjectAccessor } from "../handlers/project/types";
import { ProjectKey } from "../handlers/keys";

/** Resolves the current project and pins it on context under ProjectKey. */
export function withProject(accessor: ProjectAccessor): Middleware {
  return (h) => ({
    name: () => h.name(),
    description: () => h.description(),
    flags: () => h.flags(),
    arguments: () => h.arguments(),
    children: () => h.children(),
    handle: async (ctx, flags, args) => {
      const project = await accessor.find();
      if (!project) {
        throw new Error("No agentcore project found in the current directory");
      }
      await h.handle(ctx.withValue(ProjectKey, project), flags, args);
    },
  });
}

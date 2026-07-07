import { createHandler } from "../../../router";
import type { Core } from "../../types.tsx";

export const createListVersionsHandler = (_core: Core) =>
  createHandler({
    name: "list-versions",
    description: "list a harness's versions",
    // TODO: declare flags (--id) and implement.
    handle: async () => {
      throw new Error("Not implemented");
    },
  });

export { HarnessListVersionsScreen } from "./screen.tsx";

import { createHandler } from "../../../router";
import type { Core } from "../../types.tsx";

export const createGetVersionsHandler = (_core: Core) =>
  createHandler({
    name: "get-versions",
    description: "get a harness's versions",
    // TODO: declare flags (--id) and implement.
    handle: async () => {
      throw new Error("Not implemented");
    },
  });

export { HarnessGetVersionsScreen } from "./screen.tsx";

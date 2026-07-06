import { createHandler } from "../../../router";
import type { Core } from "../../types.tsx";

export const createUpdateHarnessHandler = (_core: Core) =>
  createHandler({
    name: "update",
    description: "update a harness",
    // TODO: declare flags and implement.
    handle: async () => {
      throw new Error("Not implemented");
    },
  });

export { HarnessUpdateScreen } from "./screen.tsx";

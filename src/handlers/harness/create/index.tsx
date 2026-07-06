import { createHandler } from "../../../router";
import type { Core } from "../../types.tsx";

export const createCreateHarnessHandler = (_core: Core) =>
  createHandler({
    name: "create",
    description: "create a harness",
    // TODO: declare flags and implement.
    handle: async () => {
      throw new Error("Not implemented");
    },
  });

export { HarnessCreateScreen } from "./screen.tsx";

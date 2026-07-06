import { createHandler } from "../../../router";
import type { Core } from "../../types.tsx";

export const createDeleteHarnessHandler = (_core: Core) =>
  createHandler({
    name: "delete",
    description: "delete a harness",
    // TODO: declare flags and implement.
    handle: async () => {
      throw new Error("Not implemented");
    },
  });

export { HarnessDeleteScreen } from "./screen.tsx";

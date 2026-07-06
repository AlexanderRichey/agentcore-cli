import { createHandler } from "../../../router";
import type { Core } from "../../types.tsx";

export const createExecHarnessHandler = (_core: Core) =>
  createHandler({
    name: "exec",
    description: "run a shell command in a harness",
    // TODO: declare flags and implement.
    handle: async () => {
      throw new Error("Not implemented");
    },
  });

export { HarnessExecScreen } from "./screen.tsx";

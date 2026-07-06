import { createHandler } from "../../../router";
import type { Core } from "../../types.tsx";

export const createInvokeHarnessHandler = (_core: Core) =>
  createHandler({
    name: "invoke",
    description: "invoke a harness",
    // TODO: declare flags and implement.
    handle: async () => {
      throw new Error("Not implemented");
    },
  });

export { HarnessInvokeScreen } from "./screen.tsx";

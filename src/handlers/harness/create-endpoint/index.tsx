import { createHandler } from "../../../router";
import type { Core } from "../../types.tsx";

export const createCreateEndpointHandler = (_core: Core) =>
  createHandler({
    name: "create-endpoint",
    description: "create a harness endpoint",
    // TODO: declare flags (--id) and implement.
    handle: async () => {
      throw new Error("Not implemented");
    },
  });

export { HarnessCreateEndpointScreen } from "./screen.tsx";

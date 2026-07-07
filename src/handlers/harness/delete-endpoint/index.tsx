import { createHandler } from "../../../router";
import type { Core } from "../../types.tsx";

export const createDeleteEndpointHandler = (_core: Core) =>
  createHandler({
    name: "delete-endpoint",
    description: "delete a harness endpoint",
    // TODO: declare flags (--id, --qualifier) and implement.
    handle: async () => {
      throw new Error("Not implemented");
    },
  });

export { HarnessDeleteEndpointScreen } from "./screen.tsx";

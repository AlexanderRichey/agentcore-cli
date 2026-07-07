import { createHandler } from "../../../router";
import type { Core } from "../../types.tsx";

export const createUpdateEndpointHandler = (_core: Core) =>
  createHandler({
    name: "update-endpoint",
    description: "update a harness endpoint",
    // TODO: declare flags (--id, --qualifier) and implement.
    handle: async () => {
      throw new Error("Not implemented");
    },
  });

export { HarnessUpdateEndpointScreen } from "./screen.tsx";

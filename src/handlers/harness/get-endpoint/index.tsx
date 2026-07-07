import { createHandler } from "../../../router";
import type { Core } from "../../types.tsx";

export const createGetEndpointHandler = (_core: Core) =>
  createHandler({
    name: "get-endpoint",
    description: "get a harness endpoint",
    // TODO: declare flags (--id, --qualifier) and implement.
    handle: async () => {
      throw new Error("Not implemented");
    },
  });

export { HarnessGetEndpointScreen } from "./screen.tsx";

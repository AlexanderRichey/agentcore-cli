import { createHandler } from "../../../router";
import { EndpointKey, RegionKey } from "../../keys.tsx";
import type { Core } from "../../types.tsx";
import { renderJson } from "../../../tui";

export const createListHarnessHandler = (core: Core) =>
  createHandler({
    name: "list",
    description: "List harnesses",
    handle: async (ctx) => {
      const harnesss = await core.harness.listHarnesses(undefined, {
        region: ctx.require(RegionKey),
        endpointUrl: ctx.value(EndpointKey),
      });
      renderJson(harnesss);
    },
  });

export { HarnessListScreen } from "./screen.tsx";

import { createHandler } from "../../router";
import { RegionKey } from "../keys.tsx";
import type { Core } from "../types.tsx";

export const createListHarnessHandler = (core: Core) =>
  createHandler({
    name: "list",
    description: "List harnesses",
    handle: async (ctx) => {
      const region = ctx.require(RegionKey);
      const harnesss = await core.harness.listHarnesses(region, "test");
      console.log(harnesss);
    },
  });

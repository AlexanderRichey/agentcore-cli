import { createHandler } from "../../router";
import { RegionKey } from "../keys.tsx";
import type { CoreHarnessClient } from "./types";

export const createListHarnessHandler = (core: CoreHarnessClient) =>
  createHandler({
    name: "list",
    description: "List harnesses",
    handle: async (ctx) => {
      const region = ctx.require(RegionKey);
      const harnesss = await core.listHarnesses(region, "test");
      console.log(harnesss);
    },
  });

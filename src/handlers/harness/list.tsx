import { createHandler } from "../../router";
import type { coreHarnessClient } from "./types";

export const createListHarnessHandler = (core: coreHarnessClient) => createHandler({
  name: "list",
  description: "List harnesses",
  handle: async (ctx, args) => {
    const region = ctx.value("region")
    const harnesss = await core.listHarnesses(region, "test")
    console.log(harnesss)
  },
})

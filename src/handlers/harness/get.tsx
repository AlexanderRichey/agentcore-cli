import { createHandler } from "../../router";
import type { coreHarnessClient } from "./types";

export const createGetHarnessHandler = (core: coreHarnessClient) => createHandler({
  name: "get",
  description: "Get a harness",
  handle: async (ctx, args) => {
    const region = ctx.value("region")
    const harness = await core.getHarness(region, "test")
    console.log(harness)
  },
})

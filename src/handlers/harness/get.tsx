import z from "zod";
import { createHandler } from "../../router";
import type { CoreHarnessClient } from "./types";

export const createGetHarnessHandler = (core: CoreHarnessClient) => createHandler({
  name: "get",
  description: "Get a harness",
  arguments: [
    {
      name: "harness-id",
      description: "The ID of the harness",
      schema: z.string().max(48)
    }
  ],
  handle: async (ctx, args) => {
    const region = ctx.value("region")
    const harness = await core.getHarness(region, "test")
    console.log(harness)
  },
})

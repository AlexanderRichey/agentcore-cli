import z from "zod";
import { createHandler, flag } from "../../router";
import type { CoreHarnessClient } from "./types";

export const createGetHarnessHandler = (core: CoreHarnessClient) =>
  createHandler({
    name: "get",
    description: "Get a harness",
    flags: [flag("id", "The ID of the harness", z.string().max(48))],
    handle: async (ctx, flags) => {
      const region = ctx.value("region");
      // `flags` is typed as { "id": string } and already validated.
      const harness = await core.getHarness(region, flags["id"]);
      console.log(harness);
    },
  });

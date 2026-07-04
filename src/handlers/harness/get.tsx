import z from "zod";
import { createHandler, flag, PathKey } from "../../router";
import { RegionKey } from "../keys.tsx";
import type { Core } from "../types.tsx";

export const createGetHarnessHandler = (core: Core) =>
  createHandler({
    name: "get",
    description: "Get a harness",
    flags: [flag("id", "The ID of the harness", z.string().max(48).optional())],
    handle: async (ctx, flags, args) => {
      const region = ctx.require(RegionKey);
      const harness = await core.harness.getHarness(region, flags["id"] as string);
      console.log(harness);
    },
  });

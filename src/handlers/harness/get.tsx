import z from "zod";
import { createHandler, flag } from "../../router";
import { RegionKey } from "../keys.tsx";
import type { CoreHarnessClient } from "./types";
import { PathKey } from "../../router/router.tsx";

export const createGetHarnessHandler = (core: CoreHarnessClient) =>
  createHandler({
    name: "get",
    description: "Get a harness",
    flags: [flag("id", "The ID of the harness", z.string().max(48))],
    handle: async (ctx, flags) => {
      const path = ctx.require(PathKey);
      console.log(path);
      // RegionKey resolves to a typed `string`; `flags.id` is validated `string`.
      const region = ctx.require(RegionKey);
      const harness = await core.getHarness(region, flags["id"]);
      console.log(harness);
    },
  });

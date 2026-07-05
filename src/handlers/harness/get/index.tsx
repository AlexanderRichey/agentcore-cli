import z from "zod";
import { createHandler, flag } from "../../../router";
import { EndpointKey, RegionKey } from "../../keys.tsx";
import type { Core } from "../../types.tsx";
import { renderJson } from "../../../tui";

export const createGetHarnessHandler = (core: Core) =>
  createHandler({
    name: "get",
    description: "Get a harness",
    flags: [flag("id", "The ID of the harness", z.string().max(48).optional())],
    handle: async (ctx, flags, args) => {
      const harness = await core.harness.getHarness(flags["id"] as string, {
        region: ctx.require(RegionKey),
        endpointUrl: ctx.value(EndpointKey),
      });
      renderJson(harness);
    },
  });

export { HarnessGetScreen } from "./screen.tsx";

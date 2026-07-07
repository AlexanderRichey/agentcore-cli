import z from "zod";
import { createHandler, flag } from "../../../router";
import type { Core } from "../../types.tsx";
import { coreOptsFromCtx } from "../../utils.tsx";
import { JsonRendererKey } from "../../../tui";

export const createGetEndpointHandler = (core: Core) =>
  createHandler({
    name: "get-endpoint",
    description: "get a harness endpoint",
    flags: [
      flag("id", "the ID of the harness", z.string().max(48).optional()),
      flag("qualifier", "the endpoint name (qualifier)", z.string().optional()),
    ],
    handle: async (ctx, flags) => {
      if (!flags["id"]) {
        throw new TypeError("required option '--id <id>' not specified");
      }
      if (!flags["qualifier"]) {
        throw new TypeError("required option '--qualifier <qualifier>' not specified");
      }

      const endpoint = await core.harness.getHarnessEndpoint(
        flags["id"],
        flags["qualifier"],
        coreOptsFromCtx(ctx),
      );
      ctx.require(JsonRendererKey).renderJson(endpoint);
    },
  });

export { HarnessGetEndpointScreen } from "./screen.tsx";

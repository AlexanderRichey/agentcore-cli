import z from "zod";
import { createHandler, flag } from "../../../router";
import type { Core } from "../../types.tsx";
import { coreOptsFromCtx } from "../../utils.tsx";
import { renderJson } from "../../../tui";

export const createGetHarnessHandler = (core: Core) =>
  createHandler({
    name: "get",
    description: "get a harness",
    flags: [flag("id", "the ID of the harness", z.string().max(48).optional())],
    handle: async (ctx, flags) => {
      if (!flags["id"]) {
        throw new TypeError("required option '--id <id>' not specified");
      }

      const harness = await core.harness.getHarness(flags["id"], coreOptsFromCtx(ctx));
      renderJson(harness);
    },
  });

export { HarnessGetScreen } from "./screen.tsx";

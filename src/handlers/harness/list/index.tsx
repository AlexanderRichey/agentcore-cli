import { createHandler, flag } from "../../../router";
import type { Core } from "../../types.tsx";
import { coreOptsFromCtx } from "../../utils.tsx";
import { renderJson } from "../../../tui";
import z from "zod";

export const createListHarnessHandler = (core: Core) =>
  createHandler({
    name: "list",
    description: "List harnesses",
    flags: [
      flag("next-token", "next token to use on paginated", z.string().optional()),
      flag("max-results", "max number of items to return", z.number().optional()),
    ],
    handle: async (ctx, flags) => {
      renderJson(
        await core.harness.listHarnesses(
          flags["next-token"],
          flags["max-results"],
          coreOptsFromCtx(ctx),
        ),
      );
    },
  });

export { HarnessListScreen } from "./screen.tsx";

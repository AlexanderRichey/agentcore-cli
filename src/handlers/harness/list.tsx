import { createHandler, LoggerKey } from "../../router";
import { RegionKey } from "../keys.tsx";
import type { CoreHarnessClient } from "./types";

export const createListHarnessHandler = (core: CoreHarnessClient) =>
  createHandler({
    name: "list",
    description: "List harnesses",
    handle: async (ctx) => {
      const region = ctx.require(RegionKey);
      const logger = ctx.require(LoggerKey);
      const harnesses = await core.listHarnesses(region, "test");

      logger.info(harnesses);
    },
  });

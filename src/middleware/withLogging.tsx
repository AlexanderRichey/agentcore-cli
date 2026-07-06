import type { Logger } from "../logging";
import type { Middleware } from "../router";
import { LoggerKey, PathKey } from "../router";

interface WithLoggingConfig {
  getLogger: () => Logger;
}

export function withLogging(config: WithLoggingConfig): Middleware {
  return (h) => ({
    name: () => h.name(),
    description: () => h.description(),
    flags: () => h.flags(),
    arguments: () => h.arguments(),
    children: () => h.children(),
    handle: async (ctx, flags, args) => {
      const commandPath = ctx.require(PathKey);
      const logger = config.getLogger().child({ commandPath });
      try {
        logger.debug({ flags, args }, "executing command with flags");
        await h.handle(ctx.withValue<Logger>(LoggerKey, logger), flags, args);
        logger.debug("command executed successfully");
      } catch (err) {
        logger.error(err instanceof Error ? err : new Error(String(err)), "command failed");
        throw err;
      }
    },
  });
}

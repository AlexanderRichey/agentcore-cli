import type { Logger } from "../logging";
import type { Middleware } from "../router";
import { LoggerKey, PathKey } from "../router";

interface WithLoggingConfig {
  logger: Logger;
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
      const logger = config.logger.child({ commandPath });
      try {
        logger.debug({ flags, args }, "executing command");
        await h.handle(ctx.withValue<Logger>(LoggerKey, logger), flags, args);
        logger.debug("command executed successfully");
      } catch (err) {
        logger.error(err instanceof Error ? err : new Error(String(err)), "command failed");
        throw err;
      }
    },
  });
}

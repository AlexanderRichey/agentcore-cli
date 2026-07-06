import type { LogArgs, Logger, LoggingMiddleware } from "./types";

/** Strips stack traces from Errors, logging only the name and message. */
export const withoutStackTrace: LoggingMiddleware = (logger) => {
  const serializeArgs = (args: LogArgs): LogArgs =>
    args.map((arg) => (arg instanceof Error ? `${arg.name}: ${arg.message}` : arg)) as LogArgs;

  return {
    ...logger,
    debug: (...args) => logger.debug(...serializeArgs(args)),
    info: (...args) => logger.info(...serializeArgs(args)),
    warn: (...args) => logger.warn(...serializeArgs(args)),
    error: (...args) => logger.error(...serializeArgs(args)),
  };
};

export function useMiddleware(logger: Logger, middleware: LoggingMiddleware[]) {
  return middleware.reduce((acc, f) => f(acc), logger);
}

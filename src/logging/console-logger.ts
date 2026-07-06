import { useMiddleware, withoutStackTrace } from "./middleware";
import { LOG_LEVEL, type Logger, type LoggingMiddleware, type LogLevel } from "./types";

export interface ConsoleOutput {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface ConsoleLoggerConfig {
  logLevel: LogLevel;
  output: ConsoleOutput;
  middleware?: LoggingMiddleware[];
}

/** Creates a logger that writes to the console, gated by the configured level. */
export function createConsoleLogger(config: ConsoleLoggerConfig): Logger {
  const middleware = [withoutStackTrace, ...(config.middleware ?? [])];
  const out = config.output;
  const minLogLevel = config.logLevel.priority;

  const noop = () => {};

  const logger: Logger = {
    debug: minLogLevel <= LOG_LEVEL.DEBUG.priority ? out.debug.bind(out) : noop,
    info: minLogLevel <= LOG_LEVEL.INFO.priority ? out.info.bind(out) : noop,
    warn: minLogLevel <= LOG_LEVEL.WARN.priority ? out.warn.bind(out) : noop,
    error: minLogLevel <= LOG_LEVEL.ERROR.priority ? out.error.bind(out) : noop,
    child: () => createConsoleLogger(config),
    flush: () => Promise.resolve(),
  };

  return useMiddleware(logger, middleware);
}

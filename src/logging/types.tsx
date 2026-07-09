/**
 * Available log levels ordered by severity. `SILENT` disables all output.
 */
export const LOG_LEVEL = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  SILENT: "silent",
} as const;

export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];

export type LoggerBindings = Record<string, string | number | boolean | null | undefined>;

export type LogArgs = [object, string?] | [string];

type LogFn = (...args: LogArgs) => void;

/** App-wide structured logging contract with child-logger support and async flush. */
export interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  child: (bindings: LoggerBindings) => Logger;
}

export interface AsyncLogger extends Logger {
  child: (bindings: LoggerBindings) => AsyncLogger;
  flush: () => Promise<void>;
}

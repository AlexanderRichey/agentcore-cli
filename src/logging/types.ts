export const LOG_LEVEL = {
  DEBUG: { name: "debug", priority: 0 },
  INFO: { name: "info", priority: 1 },
  WARN: { name: "warn", priority: 2 },
  ERROR: { name: "error", priority: 3 },
  SILENT: { name: "silent", priority: 4 },
} as const;

export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];

export type LogLevelName = LogLevel["name"];

export type LoggerBindings = Record<string, string | number | boolean | null | undefined>;

export type LoggingMiddleware = (l: Logger) => Logger;

export type LogArgs = [object, string?] | [string];

type LogFn = (...args: LogArgs) => void;

export type Logger = { [K in Exclude<LogLevelName, "silent">]: LogFn } & {
  child: (bindings: LoggerBindings) => Logger;
  flush: () => Promise<void>;
};

import type { Logger, LogArgs } from "../logging";
import type { LogLevelName } from "../logging/types";

export interface LogEntry {
  level: LogLevelName;
  args: LogArgs;
}

export interface TestLogger extends Logger {
  /** All recorded log entries across every level. */
  entries: LogEntry[];

  /**
   * Returns entries logged at the given level.
   *
   * @param level - The log level to filter by.
   */
  atLevel(level: LogLevelName): LogEntry[];

  /**
   * Returns true if any entry at {@link level} has a message (or object)
   * matching {@link pattern}.
   *
   * @param level - The log level to search within.
   * @param pattern - A string or regex to match against log arguments.
   */
  hasLog(level: LogLevelName, pattern: string | RegExp): boolean;

  /** Clears all recorded entries. */
  clear(): void;
}

function matchesPattern(args: LogArgs, pattern: string | RegExp): boolean {
  for (const arg of args) {
    const text = typeof arg === "string" ? arg : JSON.stringify(arg);
    if (typeof pattern === "string" ? text.includes(pattern) : pattern.test(text)) return true;
  }
  return false;
}

/**
 * Creates an in-memory {@link Logger} that records all entries for test assertions.
 */
export function createTestLogger(): TestLogger {
  const entries: LogEntry[] = [];

  function log(level: LogLevelName) {
    return (...args: LogArgs) => {
      entries.push({ level, args });
    };
  }

  const logger: TestLogger = {
    debug: log("debug"),
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
    child: () => logger,
    flush: async () => {},
    entries,
    atLevel: (level) => entries.filter((e) => e.level === level),
    hasLog: (level, pattern) =>
      entries.some((e) => e.level === level && matchesPattern(e.args, pattern)),
    clear: () => {
      entries.length = 0;
    },
  };

  return logger;
}

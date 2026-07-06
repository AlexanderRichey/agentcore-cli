import type { LogArgs, Logger, LoggerBindings } from "./types";

interface CompositeLoggerConfig {
  loggers: Logger[];
}

/** Creates a logger that fans out each log call to all provided loggers. */
export function createCompositeLogger(config: CompositeLoggerConfig): Logger {
  return new CompositeLogger(config.loggers);
}

class CompositeLogger implements Logger {
  private loggers: Logger[];

  constructor(loggers: Logger[]) {
    this.loggers = loggers;
  }

  debug(...args: LogArgs) {
    for (const logger of this.loggers) logger.debug(...args);
  }

  info(...args: LogArgs) {
    for (const logger of this.loggers) logger.info(...args);
  }

  warn(...args: LogArgs) {
    for (const logger of this.loggers) logger.warn(...args);
  }

  error(...args: LogArgs) {
    for (const logger of this.loggers) logger.error(...args);
  }

  child(bindings: LoggerBindings): Logger {
    return new CompositeLogger(this.loggers.map((l) => l.child(bindings)));
  }

  async flush(): Promise<void> {
    await Promise.all(this.loggers.map((l) => l.flush()));
  }
}

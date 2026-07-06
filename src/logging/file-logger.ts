import pino from "pino";
import { type Logger, type LoggerBindings, type LoggingMiddleware, type LogLevel } from "./types";
import { useMiddleware } from "./middleware";

export interface FileLoggerConfig {
  filePath: string;
  maxSizeInMB?: number;
  maxFileCount?: number;
  bindings?: LoggerBindings;
  logLevel: LogLevel;
  middleware?: LoggingMiddleware[];
}

function wrapPinoLogger(pinoLogger: pino.Logger): Logger {
  return {
    debug: pinoLogger.debug.bind(pinoLogger),
    info: pinoLogger.info.bind(pinoLogger),
    warn: pinoLogger.warn.bind(pinoLogger),
    error: pinoLogger.error.bind(pinoLogger),
    child: (bindings) => wrapPinoLogger(pinoLogger.child(bindings)),
    // we convert pino's flush method that accepts a callback into a promise to make it easier to work with.
    // Note: we also treat flush as best-effort and swallow errors
    flush: () => new Promise<void>((resolve) => pinoLogger.flush(() => resolve())),
  };
}

/** Creates a logger that writes structured JSON to a rotating file at debug level. */
export function createFileLogger(config: FileLoggerConfig): Logger {
  const maxSizeInMB = config.maxSizeInMB ?? 10;
  const maxFileCount = config.maxFileCount ?? 5;
  const bindings = config.bindings ?? {};
  const middleware = config.middleware ?? [];
  const logger = wrapPinoLogger(
    pino({
      level: config.logLevel.name,
      base: undefined, // omit pid and hostname
      formatters: {
        level(label) {
          return { level: label };
        },
      },
      transport: {
        target: "pino-roll",
        options: {
          extension: ".log",
          dateFormat: "yyyy-MM-dd'T'HH-mm-ss",
          // Rotate when file reaches {maxSizeInMB} MB, and start deleting once we have {maxFileCount} files
          size: `${maxSizeInMB}m`,
          limit: { count: maxFileCount },
          file: config.filePath,
          mkdir: true,
        },
      },
    }),
  ).child(bindings);

  return useMiddleware(logger, middleware);
}

import { LOG_LEVEL, type Logger, type LoggerBindings, type LogLevel } from "./types";
import { createCompositeLogger } from "./composite-logger";
import { createConsoleLogger, type ConsoleOutput } from "./console-logger";
import { createFileLogger } from "./file-logger";
import { homedir } from "os";
import { join } from "path";

export type RootLoggerConfig = {
  consoleLogLevel?: LogLevel;
  filePath?: string;
  fileLogLevel?: LogLevel;
  bindings?: LoggerBindings;
  consoleOutput?: ConsoleOutput;
};

export const createRootLogger = (config: RootLoggerConfig): Logger => {
  const consoleLogLevel = config.consoleLogLevel ?? LOG_LEVEL.INFO;
  const fileLogLevel = config.fileLogLevel ?? LOG_LEVEL.DEBUG;
  const filePath = config.filePath ?? join(homedir(), ".agentcore", "logs", "output");
  const additionalBindings = config.bindings ?? {};

  // controls what the user sees in their console.
  const consoleLogger = createConsoleLogger({
    logLevel: consoleLogLevel,
    output: config.consoleOutput ?? console,
  });

  // debug-level logging written to file.
  const fileLogger = createFileLogger({
    filePath,
    bindings: additionalBindings,
    logLevel: fileLogLevel,
  });

  return createCompositeLogger({ loggers: [consoleLogger, fileLogger] });
};

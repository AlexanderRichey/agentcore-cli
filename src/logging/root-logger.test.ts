import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { createRootLogger } from "./root-logger";
import { LOG_LEVEL, type Logger, type LogLevelName } from "./types";
import { join } from "node:path";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { poll } from "../common";

async function readLogFile(dir: string): Promise<string> {
  const files = await readdir(dir);
  const logFile = files.find((f) => f.endsWith(".log"));
  if (!logFile) return "";
  return readFile(join(dir, logFile), "utf-8");
}

/**
 * Define an in-memory implementation of the console that includes helpers for easy testing.
 */
function inMemoryConsole() {
  const logs: { level: LogLevelName; args: unknown[] }[] = [];

  const output = {
    debug: (...args: unknown[]) => logs.push({ level: "debug", args }),
    info: (...args: unknown[]) => logs.push({ level: "info", args }),
    warn: (...args: unknown[]) => logs.push({ level: "warn", args }),
    error: (...args: unknown[]) => logs.push({ level: "error", args }),
  };

  function assertLogExists(message: string, level?: LogLevelName) {
    const found = logs.some((log) => (!level || log.level === level) && log.args.includes(message));
    expect(found).toBe(true);
  }

  function assertLogNotExists(message: string, level?: LogLevelName) {
    const found = logs.some((log) => (!level || log.level === level) && log.args.includes(message));
    expect(found).toBe(false);
  }

  function assertEmpty() {
    expect(logs).toHaveLength(0);
  }

  return { output, logs, assertLogExists, assertLogNotExists, assertEmpty };
}

describe("root logger", () => {
  let tempDir: string;
  let logger: Logger;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agentcore-log-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("file logging", () => {
    test("writes all log levels as structured JSON", async () => {
      const debugMsg = "debug message";
      const infoMsg = "info message";
      const warnMsg = "warn message";
      const errorMsg = "error message";

      logger = createRootLogger({
        consoleLogLevel: LOG_LEVEL.SILENT,
        filePath: join(tempDir, "debug"),
      });

      logger.debug({ foo: "bar" }, debugMsg);
      logger.info({ userId: 123, action: "deploy" }, infoMsg);
      logger.warn(warnMsg);
      logger.error(errorMsg);

      const content = await poll(() => readLogFile(tempDir), {
        condition: (c) => c.includes(errorMsg),
      });
      const lines = content.trim().split("\n");

      expect(lines.length).toBeGreaterThanOrEqual(4);
      expect(content).toContain(debugMsg);
      expect(content).toContain(infoMsg);
      expect(content).toContain(warnMsg);
      expect(content).toContain(errorMsg);

      // Verify structured JSON format with merged objects
      const infoLine = lines.find((l) => l.includes(infoMsg));
      expect(infoLine).toBeDefined();

      const parsed = JSON.parse(infoLine!);
      expect(parsed.userId).toBe(123);
      expect(parsed.action).toBe("deploy");
      expect(parsed.msg).toBe(infoMsg);
    });

    test("respects fileLogLevel setting", async () => {
      const debugMsg = "debug message";
      const infoMsg = "info message";
      const warnMsg = "warn message";
      const errorMsg = "error message";

      logger = createRootLogger({
        consoleLogLevel: LOG_LEVEL.SILENT,
        fileLogLevel: LOG_LEVEL.WARN,
        filePath: join(tempDir, "debug"),
      });

      logger.debug(debugMsg);
      logger.info(infoMsg);
      logger.warn(warnMsg);
      logger.error(errorMsg);

      const content = await poll(() => readLogFile(tempDir), {
        condition: (c) => c.includes(errorMsg),
      });

      expect(content).not.toContain(debugMsg);
      expect(content).not.toContain(infoMsg);
      expect(content).toContain(warnMsg);
      expect(content).toContain(errorMsg);
    });
  });

  describe("console logging", () => {
    test("only logs at consoleLogLevel and above", () => {
      const { output, assertLogExists, assertLogNotExists } = inMemoryConsole();
      const debugMsg = "debug message";
      const infoMsg = "info message";
      const warnMsg = "warn message";
      const errorMsg = "error message";

      logger = createRootLogger({
        consoleLogLevel: LOG_LEVEL.INFO,
        filePath: join(tempDir, "debug"),
        consoleOutput: output,
      });

      logger.debug(debugMsg);
      logger.info(infoMsg);
      logger.warn(warnMsg);
      logger.error(errorMsg);

      assertLogNotExists(debugMsg, "debug");
      assertLogExists(infoMsg, "info");
      assertLogExists(warnMsg, "warn");
      assertLogExists(errorMsg, "error");
    });

    test("logs nothing when level is silent", () => {
      const { output, assertEmpty } = inMemoryConsole();
      const msg = "nope";

      logger = createRootLogger({
        consoleLogLevel: LOG_LEVEL.SILENT,
        filePath: join(tempDir, "debug"),
        consoleOutput: output,
      });

      logger.debug(msg);
      logger.info(msg);
      logger.warn(msg);
      logger.error(msg);

      assertEmpty();
    });

    test("formats errors without stack trace", () => {
      const { output, assertLogExists } = inMemoryConsole();
      const error = new Error("connection timeout");

      logger = createRootLogger({
        consoleLogLevel: LOG_LEVEL.ERROR,
        filePath: join(tempDir, "debug"),
        consoleOutput: output,
      });

      logger.error(error);

      assertLogExists("Error: connection timeout", "error");
    });
  });

  describe("error serialization", () => {
    test("serializes Error objects with stack trace in file", async () => {
      const msg = "caught exception";
      const errorMsg = "direct error";

      logger = createRootLogger({
        consoleLogLevel: LOG_LEVEL.SILENT,
        filePath: join(tempDir, "debug"),
      });

      const error = new Error(errorMsg);
      logger.error(error, msg);

      const content = await poll(() => readLogFile(tempDir), {
        condition: (c) => c.includes(msg),
      });

      const line = content
        .trim()
        .split("\n")
        .find((l) => l.includes(msg));
      expect(line).toBeDefined();

      const parsedLine = JSON.parse(line!);
      expect(parsedLine.err).toBeDefined();
      expect(parsedLine.err.message).toBe(errorMsg);
    });
  });

  describe("child loggers", () => {
    test("child logger includes parent bindings in file", async () => {
      const childMsg = "child message";
      const requestId = "req-456";
      const service = "auth";

      logger = createRootLogger({
        consoleLogLevel: LOG_LEVEL.SILENT,
        filePath: join(tempDir, "debug"),
      });

      const child = logger.child({ requestId, service });
      child.info(childMsg);

      const content = await poll(() => readLogFile(tempDir), {
        condition: (c) => c.includes(childMsg),
      });

      const logLine = content
        .trim()
        .split("\n")
        .find((l) => l.includes(childMsg));
      const parsed = JSON.parse(logLine!);

      expect(parsed.requestId).toBe(requestId);
      expect(parsed.service).toBe(service);
    });
  });
});

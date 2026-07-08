import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { Router, createHandler } from "../router";
import { withLogging } from "./withLogging";
import { createFileLogger } from "../logging/file-logger";
import { LOG_LEVEL } from "../logging/types";
import { waitFor } from "../testing";
import type { Logger } from "../logging";
import { join } from "node:path";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";

async function readLogFile(dir: string): Promise<string> {
  const files = await readdir(dir);
  const logFile = files.find((f) => f.endsWith(".log"));
  if (!logFile) return "";
  return readFile(join(dir, logFile), "utf-8");
}

function parsedLines(content: string) {
  return content
    .trim()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));
}

describe("withLogging", () => {
  let tempDir: string;
  let logger: Logger;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "logging-test-"));
    logger = createFileLogger({
      filePath: join(tempDir, "output"),
      logLevel: LOG_LEVEL.DEBUG,
    });
  });

  afterEach(async () => {
    await logger.flush();
    await rm(tempDir, { recursive: true, force: true });
  });

  test("includes the command path as a binding", async () => {
    const app = new Router("myapp", "test app");
    app.use(withLogging({ logger }));
    app.handler(
      createHandler({
        name: "deploy",
        description: "deploy things",
        handle: async () => {},
      }),
    );

    await app.route(["node", "myapp", "deploy"]);
    // Note: we waitFor because pino-roll uses async worker threads that may not resolve yet.
    let content = "";
    await waitFor(async () => {
      content = await readLogFile(tempDir);
      return content.includes("deploy");
    }, 2000);

    const lines = parsedLines(content);
    const match = lines.find((l) => l.commandPath?.includes("deploy"));
    expect(match).toBeDefined();
  });

  test("logs errors when a command fails", async () => {
    const app = new Router("myapp", "test app");
    app.use(withLogging({ logger }));
    app.handler(
      createHandler({
        name: "deploy",
        description: "deploy things",
        handle: async () => {
          throw new Error("connection timeout");
        },
      }),
    );

    await app.route(["node", "myapp", "deploy"]).catch(() => {});

    let content = "";
    await waitFor(async () => {
      content = await readLogFile(tempDir);
      return content.includes("error");
    }, 2000);

    const lines = parsedLines(content);
    const match = lines.find((l) => l.level === "error");
    expect(match).toBeDefined();
    expect(match.err?.message).toBe("connection timeout");
  });

  test("logs successful completion", async () => {
    const app = new Router("myapp", "test app");
    app.use(withLogging({ logger }));
    app.handler(
      createHandler({
        name: "deploy",
        description: "deploy things",
        handle: async () => {},
      }),
    );

    await app.route(["node", "myapp", "deploy"]);

    let content = "";
    await waitFor(async () => {
      content = await readLogFile(tempDir);
      return content.includes("success");
    }, 2000);

    const lines = parsedLines(content);
    const match = lines.find((l) => l.msg?.includes("success"));
    expect(match).toBeDefined();
  });
});

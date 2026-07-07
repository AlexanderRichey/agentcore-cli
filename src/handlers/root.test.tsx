import { test, expect, describe } from "bun:test";
import { createRootHandler } from "./index";
import { TestCoreClient, testIO, createInMemoryLogger } from "../testing";

describe("createRootHandler", () => {
  test("builds the agentcore command tree with its subcommands", () => {
    const root = createRootHandler(new TestCoreClient(), {
      io: testIO().io,
      logger: createInMemoryLogger(),
    });
    expect(root.name()).toBe("agentcore");
    expect(root.children().map((c) => c.name())).toEqual(["harness", "config"]);
  });
});

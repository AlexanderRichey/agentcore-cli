import { test, expect, describe } from "bun:test";
import { createRootHandler } from "./index";
import { TestCoreClient, testIO, noopLogger } from "../testing";

describe("createRootHandler", () => {
  test("builds the agentcore command tree with its subcommands", () => {
    const root = createRootHandler(new TestCoreClient(), { io: testIO().io, logger: noopLogger });
    expect(root.name()).toBe("agentcore");
    expect(root.children().map((c) => c.name())).toEqual(["harness", "config"]);
  });
});

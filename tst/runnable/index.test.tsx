import { test, expect } from "bun:test";

import { runRunnable, ExitCode } from "../../src/runnable";
import type { Runnable } from "../../src/runnable";

test("runRunnable returns SUCCESS and forwards argv when run completes", () => {
  let receivedArgv: string[] | undefined;
  const runnable: Runnable = {
    run(argv: string[]) {
      receivedArgv = argv;
    }
  };

  const argv = ["node", "script", "--flag"];
  const code = runRunnable(() => runnable, argv);

  expect(code).toBe(ExitCode.SUCCESS);
  expect(receivedArgv).toEqual(argv);
});

test("returns FAILURE when run throws an Error", () => {
  const runnable: Runnable = {
    run() {
      throw new Error("boom");
    }
  };

  const code = runRunnable(() => runnable, []);

  expect(code).toBe(ExitCode.FAILURE);
});

test("returns FAILURE when a non-Error value is thrown", () => {
  const code = runRunnable(() => {
    throw "kaboom";
  }, []);

  expect(code).toBe(ExitCode.FAILURE);
});

import { test, expect } from "bun:test";

import {
  runRunnable,
  runWithExitCode,
  ExitCode,
  type Runnable,
} from "../../src/runnable/index.tsx";

test("returns SUCCESS and forwards argv when run completes", async () => {
  let receivedArgv: string[] | undefined;
  const runnable: Runnable = {
    run: async (argv: string[]) => {
      receivedArgv = argv;
    },
  };

  const argv = ["node", "script", "--flag"];
  const code = await runRunnable(() => runnable, argv);

  expect(code).toBe(ExitCode.SUCCESS);
  expect(receivedArgv).toEqual(argv);
});

test("returns FAILURE when run rejects with an Error", async () => {
  const runnable: Runnable = {
    run: async () => {
      throw new Error("boom");
    },
  };

  const code = await runRunnable(() => runnable, []);

  expect(code).toBe(ExitCode.FAILURE);
});

test("returns FAILURE when the factory throws a non-Error value", async () => {
  const code = await runRunnable(() => {
    throw "kaboom";
  }, []);

  expect(code).toBe(ExitCode.FAILURE);
});

test("runWithExitCode returns SUCCESS for a resolving function", async () => {
  const code = await runWithExitCode(async () => {});
  expect(code).toBe(ExitCode.SUCCESS);
});

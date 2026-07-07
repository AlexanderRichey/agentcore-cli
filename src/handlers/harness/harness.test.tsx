import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { CoreClient } from "../../core";
import { createRootHandler } from "../index";
import { fixtureFactories, matchGolden, testIO } from "../../testing";

// End-to-end command-flow tests for the `harness` subtree.
//
// Each test builds the *real* root handler over a *real* CoreClient whose SDK
// clients are the fixture-backed fakes, then drives it through the top-level
// `route()` exactly as the CLI does. So a single test covers argument parsing,
// the withRegion / withTuiOnEmptyFlagsAndArgs middleware, the leaf handler, the
// CoreClient/HarnessClient, and the rendered output — against recorded data.
//
// Record fixtures + golden output with `RECORD=1 bun test`; every other run
// replays them offline.

const FIXTURES = join(import.meta.dir, "__fixtures__");
// Pin a region so recordings are stable regardless of the machine's AWS env.
const REGION = "us-west-2";

// run builds a fresh handler tree (CoreClient carries per-run caches, so this
// keeps tests isolated) over an in-memory io, routes `args` beneath `agentcore`,
// and returns whatever the command wrote to stdout.
async function run(args: string[]): Promise<string> {
  const { createControlClient, createDataClient } = fixtureFactories(FIXTURES);
  const core = new CoreClient(createControlClient, createDataClient);
  const io = testIO();
  const root = createRootHandler(core, io.io);
  await root.route(["node", "agentcore", ...args, "--region", REGION]);
  return io.stdout();
}

describe("harness list", () => {
  // `--json` keeps output machine-readable; without any own flags the
  // withTuiOnEmptyFlagsAndArgs middleware would instead launch the interactive
  // TUI (covered by the screen tests).
  test("prints the listed harnesses as JSON", async () => {
    const out = await run(["harness", "list", "--json"]);
    matchGolden(FIXTURES, "list.golden.json", out);
  });

  test("output is valid JSON containing a harnesses array", async () => {
    const out = await run(["harness", "list", "--json"]);
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed.harnesses)).toBe(true);
  });
});

describe("harness get", () => {
  test("prints the harness detail as JSON for a given id", async () => {
    const out = await run(["harness", "get", "--id", "MyPDXHarness-rhkXkAE1IS"]);
    matchGolden(FIXTURES, "get.golden.json", out);
  });

  test("errors when --id is omitted (leaf requires it)", async () => {
    // No id and no other flags would normally open the TUI, but withRegion adds
    // no arg; the get leaf throws its own required-option error. Assert the flow
    // surfaces it rather than printing output.
    await expect(run(["harness", "get", "--id", ""])).rejects.toThrow(/--id/);
  });
});

describe("harness list-endpoints", () => {
  test("prints the harness's endpoints as JSON for a given id", async () => {
    const out = await run(["harness", "list-endpoints", "--id", "MyPDXHarness-rhkXkAE1IS"]);
    matchGolden(FIXTURES, "list-endpoints.golden.json", out);
  });

  test("output is valid JSON containing an endpoints array", async () => {
    const out = await run(["harness", "list-endpoints", "--id", "MyPDXHarness-rhkXkAE1IS"]);
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed.endpoints)).toBe(true);
  });

  test("errors when --id is omitted (leaf requires it)", async () => {
    await expect(run(["harness", "list-endpoints", "--id", ""])).rejects.toThrow(/--id/);
  });
});

describe("harness get-endpoint", () => {
  test("prints the endpoint detail as JSON for a given id and qualifier", async () => {
    const out = await run([
      "harness",
      "get-endpoint",
      "--id",
      "MyPDXHarness-rhkXkAE1IS",
      "--qualifier",
      "DEFAULT",
    ]);
    matchGolden(FIXTURES, "get-endpoint.golden.json", out);
  });

  test("errors when --id is omitted (leaf requires it)", async () => {
    await expect(
      run(["harness", "get-endpoint", "--id", "", "--qualifier", "DEFAULT"]),
    ).rejects.toThrow(/--id/);
  });

  test("errors when --qualifier is omitted (leaf requires it)", async () => {
    await expect(
      run(["harness", "get-endpoint", "--id", "MyPDXHarness-rhkXkAE1IS", "--qualifier", ""]),
    ).rejects.toThrow(/--qualifier/);
  });
});

describe("harness list-versions", () => {
  test("prints the harness's versions as JSON for a given id", async () => {
    const out = await run(["harness", "list-versions", "--id", "MyPDXHarness-rhkXkAE1IS"]);
    matchGolden(FIXTURES, "list-versions.golden.json", out);
  });

  test("output is valid JSON containing a harnessVersions array", async () => {
    const out = await run(["harness", "list-versions", "--id", "MyPDXHarness-rhkXkAE1IS"]);
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed.harnessVersions)).toBe(true);
  });

  test("errors when --id is omitted (leaf requires it)", async () => {
    await expect(run(["harness", "list-versions", "--id", ""])).rejects.toThrow(/--id/);
  });
});

describe("harness get-version", () => {
  test("prints the harness detail as JSON for a given id and version", async () => {
    const out = await run([
      "harness",
      "get-version",
      "--id",
      "MyPDXHarness-rhkXkAE1IS",
      "--version",
      "1",
    ]);
    matchGolden(FIXTURES, "get-version.golden.json", out);
  });

  test("errors when --id is omitted (leaf requires it)", async () => {
    await expect(run(["harness", "get-version", "--id", "", "--version", "1"])).rejects.toThrow(
      /--id/,
    );
  });

  test("errors when --version is omitted (leaf requires it)", async () => {
    await expect(
      run(["harness", "get-version", "--id", "MyPDXHarness-rhkXkAE1IS", "--version", ""]),
    ).rejects.toThrow(/--version/);
  });
});

describe("unimplemented harness subcommands", () => {
  // These leaves are scaffolded but not yet implemented. Locking in their
  // current behavior documents the surface and flags the day they change.
  for (const cmd of [
    "create",
    "update",
    "delete",
    "create-endpoint",
    "update-endpoint",
    "delete-endpoint",
  ]) {
    test(`\`harness ${cmd}\` reports not implemented`, async () => {
      // Pass a throwaway flag so the empty-args TUI middleware doesn't engage.
      await expect(run(["harness", cmd, "--json"])).rejects.toThrow(/Not implemented/);
    });
  }
});

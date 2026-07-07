import { test, expect, describe, afterEach } from "bun:test";
import type { HarnessSummary } from "@aws-sdk/client-bedrock-agentcore-control";
import {
  renderScreen,
  waitForText,
  waitFor,
  cleanupScreens,
  TestCoreClient,
} from "../../../testing";

afterEach(cleanupScreens);

// Behavior tests for the harness list screen, mounted through the real Root at
// its route. Data comes from a TestCoreClient, so we assert on what the user
// sees for each query state and how selection/back navigation behave.

function harness(overrides: Partial<HarnessSummary> = {}): HarnessSummary {
  return {
    harnessId: "MyHarness-abc123",
    harnessName: "MyHarness",
    arn: "arn:aws:bedrock-agentcore:us-east-1:123:harness/MyHarness-abc123",
    createdAt: new Date("2026-04-22T21:53:06.235Z"),
    updatedAt: new Date("2026-04-22T21:53:27.062Z"),
    harnessVersion: "1",
    status: "READY",
    ...overrides,
  };
}

function coreWith(harnesses: HarnessSummary[]): TestCoreClient {
  const core = new TestCoreClient();
  core.harness.setListResponse({ harnesses });
  return core;
}

// A HarnessSummary is enough for the detail screen's render (it stringifies
// whatever `harness` field it gets), so reuse it as the get response, widening
// to the response's `harness` type.
function getResponse(summary: HarnessSummary) {
  return { harness: summary } as Parameters<TestCoreClient["harness"]["setGetResponse"]>[0];
}

describe("harness list screen", () => {
  test("renders each harness as a row once loaded", async () => {
    const core = coreWith([
      harness({ harnessName: "alpha", harnessId: "alpha-1" }),
      harness({ harnessName: "beta", harnessId: "beta-2" }),
    ]);
    const r = renderScreen("/agentcore/harness/list", { core });

    await waitForText(r.lastFrame, "alpha");
    const frame = r.lastFrame()!;
    expect(frame).toContain("beta");
    expect(frame).toContain("READY");
    // Column headers are present.
    expect(frame).toContain("Name");
    expect(frame).toContain("Status");
    r.unmount();
  });

  test("shows a loading indicator before data arrives", async () => {
    // A list response that never resolves keeps the screen pending.
    const core = new TestCoreClient();
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = core.harness.listHarnesses.bind(core.harness);
    core.harness.listHarnesses = async (...args) => {
      await pending;
      return original(...args);
    };

    const r = renderScreen("/agentcore/harness/list", { core });
    await waitForText(r.lastFrame, "Loading harnesses");
    expect(r.lastFrame()).toContain("Loading harnesses");
    release?.();
    r.unmount();
  });

  test("shows the error message when the list call fails", async () => {
    const core = new TestCoreClient();
    core.harness.setError(new Error("access denied"));
    const r = renderScreen("/agentcore/harness/list", { core });

    await waitForText(r.lastFrame, "Error:");
    expect(r.lastFrame()).toContain("access denied");
    r.unmount();
  });

  test("calls listHarnesses with the region from context", async () => {
    const core = coreWith([harness()]);
    const r = renderScreen("/agentcore/harness/list", { core });

    await waitFor(() => core.harness.calls.length > 0);
    const call = core.harness.calls.find((c) => c.method === "listHarnesses")!;
    expect((call.args[2] as { region: string }).region).toBe("us-east-1");
    r.unmount();
  });

  test("enter on a row navigates to that harness's detail screen", async () => {
    const core = coreWith([harness({ harnessName: "pickme", harnessId: "pickme-9" })]);
    // The get screen refetches the single harness; give it a response too.
    core.harness.setGetResponse(
      getResponse(harness({ harnessName: "pickme", harnessId: "pickme-9" })),
    );
    const r = renderScreen("/agentcore/harness/list", { core });

    await waitForText(r.lastFrame, "pickme");
    await r.press("return");
    // Detail screen breadcrumb includes the harness id.
    await waitForText(r.lastFrame, "pickme-9");
    r.unmount();
  });

  test("esc returns to the harness menu", async () => {
    const core = coreWith([harness()]);
    const r = renderScreen("/agentcore/harness/list", { core });

    await waitForText(r.lastFrame, "MyHarness");
    await r.press("escape");
    // Back at the harness command menu — it shows the harness subcommands (e.g.
    // the "get a harness" option), which the list table never does.
    await waitForText(r.lastFrame, "get a harness");
    expect(r.lastFrame()).toContain("manage agentcore harnesses");
    r.unmount();
  });
});

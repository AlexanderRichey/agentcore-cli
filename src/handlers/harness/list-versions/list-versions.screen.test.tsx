import { test, expect, describe, afterEach } from "bun:test";
import type { HarnessVersionSummary } from "@aws-sdk/client-bedrock-agentcore-control";
import {
  renderScreen,
  waitForText,
  waitFor,
  cleanupScreens,
  TestCoreClient,
} from "../../../testing";

afterEach(cleanupScreens);

// Behavior tests for the version listing flow: harness picker → version table →
// version JSON detail.

function version(overrides: Partial<HarnessVersionSummary> = {}): HarnessVersionSummary {
  return {
    harnessId: "MyHarness-abc123",
    harnessName: "MyHarness",
    arn: "arn:aws:bedrock-agentcore:us-east-1:123:harness/MyHarness-abc123",
    harnessVersion: "1",
    status: "READY",
    createdAt: new Date("2026-04-22T21:53:06.235Z"),
    updatedAt: new Date("2026-04-22T21:53:27.062Z"),
    ...overrides,
  };
}

function coreWithVersions(versions: HarnessVersionSummary[]): TestCoreClient {
  const core = new TestCoreClient();
  core.harness.setListResponse({
    harnesses: [
      {
        harnessId: "MyHarness-abc123",
        harnessName: "MyHarness",
        arn: "arn:aws:bedrock-agentcore:us-east-1:123:harness/MyHarness-abc123",
        createdAt: new Date("2026-04-22T21:53:06.235Z"),
        updatedAt: new Date("2026-04-22T21:53:27.062Z"),
        harnessVersion: "2",
        status: "READY",
      },
    ],
  });
  core.harness.setListVersionsResponse({ harnessVersions: versions });
  return core;
}

describe("harness list-versions screen", () => {
  test("without a harness id, picking a harness lists its versions", async () => {
    const core = coreWithVersions([version()]);
    const r = renderScreen("/agentcore/harness/list-versions", { core });

    await waitForText(r.lastFrame, "MyHarness");
    expect(r.lastFrame()).toContain("choose a harness to list versions for");

    await r.press("return");
    await waitFor(() => core.harness.calls.some((c) => c.method === "listHarnessVersions"));
    const call = core.harness.calls.find((c) => c.method === "listHarnessVersions")!;
    expect(call.args[0]).toBe("MyHarness-abc123");
    r.unmount();
  });

  test("renders versions newest first", async () => {
    const core = coreWithVersions([version(), version({ harnessVersion: "2" })]);
    const r = renderScreen("/agentcore/harness/list-versions/MyHarness-abc123", { core });

    await waitForText(r.lastFrame, "READY");
    const frame = r.lastFrame()!;
    // Both rows render, "2" above "1".
    expect(frame.indexOf(" 2 ")).toBeGreaterThan(-1);
    expect(frame.indexOf("Version")).toBeLessThan(frame.indexOf("READY"));
    r.unmount();
  });

  test("enter on a row opens the version's JSON detail", async () => {
    const core = coreWithVersions([version({ harnessVersion: "2" }), version()]);
    core.harness.setGetVersionResponse({
      harness: {
        harnessId: "MyHarness-abc123",
        harnessName: "MyHarness",
        harnessVersion: "2",
        status: "READY",
      },
    } as Awaited<ReturnType<TestCoreClient["harness"]["getHarnessVersion"]>>);
    const r = renderScreen("/agentcore/harness/list-versions/MyHarness-abc123", { core });

    await waitForText(r.lastFrame, "READY");
    await r.press("return");
    await waitForText(r.lastFrame, '"harnessVersion"');
    expect(r.lastFrame()).toContain("get-version → MyHarness-abc123 → 2");
    const call = core.harness.calls.find((c) => c.method === "getHarnessVersion")!;
    expect(call.args[0]).toBe("MyHarness-abc123");
    expect(call.args[1]).toBe("2");
    r.unmount();
  });

  test("shows the error message when the list call fails", async () => {
    const core = new TestCoreClient();
    core.harness.setError(new Error("access denied"));
    const r = renderScreen("/agentcore/harness/list-versions/MyHarness-abc123", { core });

    await waitForText(r.lastFrame, "Error:");
    expect(r.lastFrame()).toContain("access denied");
    r.unmount();
  });
});

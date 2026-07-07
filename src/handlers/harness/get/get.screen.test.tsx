import { test, expect, describe, afterEach } from "bun:test";
import type { GetHarnessResponse } from "@aws-sdk/client-bedrock-agentcore-control";
import {
  renderScreen,
  waitForText,
  waitFor,
  cleanupScreens,
  TestCoreClient,
} from "../../../testing";

afterEach(cleanupScreens);

// Behavior tests for the harness detail (get) screen. The harness id comes from
// the route path; the screen fetches that single harness and renders it as a
// scrollable JSON block.

// getResponse builds a GetHarnessResponse. The detail screen just stringifies
// whatever `harness` it receives, so a minimal shape (cast to the SDK's Harness)
// is enough to test rendering behavior without constructing every field.
function getResponse(): GetHarnessResponse {
  return {
    harness: {
      harnessId: "MyHarness-abc123",
      harnessName: "MyHarness",
      status: "READY",
      harnessVersion: "1",
      updatedAt: new Date("2026-04-22T21:53:27.062Z"),
    },
  } as GetHarnessResponse;
}

describe("harness detail screen", () => {
  test("renders the harness JSON once loaded", async () => {
    const core = new TestCoreClient();
    core.harness.setGetResponse(getResponse());
    const r = renderScreen("/agentcore/harness/get/MyHarness-abc123", { core });

    // Wait for a body-only marker (the breadcrumb already contains the id).
    await waitForText(r.lastFrame, "harnessName");
    expect(r.lastFrame()).toContain("READY");
    r.unmount();
  });

  test("fetches the harness id taken from the route path", async () => {
    const core = new TestCoreClient();
    core.harness.setGetResponse(getResponse());
    const r = renderScreen("/agentcore/harness/get/MyHarness-abc123", { core });

    await waitFor(() => core.harness.calls.length > 0);
    const call = core.harness.calls.find((c) => c.method === "getHarness")!;
    expect(call.args[0]).toBe("MyHarness-abc123");
    r.unmount();
  });

  test("shows the error message when the get call fails", async () => {
    const core = new TestCoreClient();
    core.harness.setError(new Error("harness not found"));
    const r = renderScreen("/agentcore/harness/get/does-not-exist", { core });

    await waitForText(r.lastFrame, "Error:");
    expect(r.lastFrame()).toContain("harness not found");
    r.unmount();
  });

  test("shows the harness id in the breadcrumb", async () => {
    const core = new TestCoreClient();
    core.harness.setGetResponse(getResponse());
    const r = renderScreen("/agentcore/harness/get/MyHarness-abc123", { core });

    await waitForText(r.lastFrame, "agentcore → harness → get → MyHarness-abc123");
    r.unmount();
  });

  test("arrow/jk keys scroll the JSON without crashing", async () => {
    const core = new TestCoreClient();
    core.harness.setGetResponse(getResponse());
    const r = renderScreen("/agentcore/harness/get/MyHarness-abc123", { core });

    await waitForText(r.lastFrame, "harnessName");
    // Drive the scroll handler (down/up/j/k); the content still renders.
    await r.press("down");
    await r.press("up");
    await r.write("j");
    await r.write("k");
    expect(r.lastFrame()).toContain("harnessName");
    r.unmount();
  });

  test("bare `get` with no id redirects to the list screen", async () => {
    const core = new TestCoreClient();
    core.harness.setListResponse({
      harnesses: [
        {
          harnessId: "MyHarness-abc123",
          harnessName: "MyHarness",
          arn: "arn:aws:bedrock-agentcore:us-east-1:123:harness/MyHarness-abc123",
          createdAt: new Date("2026-04-22T21:53:06.235Z"),
          updatedAt: new Date("2026-04-22T21:53:27.062Z"),
          harnessVersion: "1",
          status: "READY",
        },
      ],
    });
    const r = renderScreen("/agentcore/harness/get", { core });

    // The redirect lands on the list, which fetches harnesses.
    await waitForText(r.lastFrame, "MyHarness");
    await waitFor(() => core.harness.calls.some((c) => c.method === "listHarnesses"));
    r.unmount();
  });
});

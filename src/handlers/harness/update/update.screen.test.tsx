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

// Behavior tests for the update-harness wizard: the create steps minus name,
// prefilled from the current configuration, submitting only what changed.

function currentHarness(): GetHarnessResponse {
  return {
    harness: {
      harnessId: "MyHarness-abc123",
      harnessName: "MyHarness",
      arn: "arn:aws:bedrock-agentcore:us-east-1:123:harness/MyHarness-abc123",
      executionRoleArn: "arn:aws:iam::123:role/Existing",
      status: "READY",
      harnessVersion: "1",
      systemPrompt: [{ text: "You are v1." }],
      tools: [
        { type: "agentcore_browser", config: { agentCoreBrowser: {} } },
        {
          type: "inline_function",
          name: "custom",
          config: { inlineFunction: { description: "d", inputSchema: {} } },
        },
      ],
      memory: { managedMemoryConfiguration: { arn: "arn:managed" } },
    },
  } as GetHarnessResponse;
}

function coreForUpdate(): TestCoreClient {
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
  core.harness.setGetResponse(currentHarness());
  core.harness.setUpdateResponse({
    harness: {
      harnessId: "MyHarness-abc123",
      harnessName: "MyHarness",
      status: "UPDATING",
      harnessVersion: "2",
    },
  } as GetHarnessResponse);
  return core;
}

describe("harness update wizard", () => {
  test("without a harness id, picking a harness opens its wizard", async () => {
    const core = coreForUpdate();
    const r = renderScreen("/agentcore/harness/update", { core });

    await waitForText(r.lastFrame, "MyHarness");
    expect(r.lastFrame()).toContain("choose a harness to update");
    await r.press("return");
    await waitForText(r.lastFrame, "Which model should the agent use?");
    r.unmount();
  });

  test("starts on model (no rename) with values prefilled from the harness", async () => {
    const core = coreForUpdate();
    const r = renderScreen("/agentcore/harness/update/MyHarness-abc123", { core });

    // The harness has no bedrock model configured, so keep-current is
    // preselected; enter leaves the model untouched.
    await waitForText(r.lastFrame, "● Keep current model");
    // The name step is absent from the stepper.
    expect(r.lastFrame()).not.toContain("Name");
    await r.press("return");

    // Managed memory is the current config and is preselected.
    await waitForText(r.lastFrame, "● Managed memory");
    await r.press("return");

    // Tools reflect the current config: browser on.
    await waitForText(r.lastFrame, "[✓] Browser");
    r.unmount();
  });

  test("prefills the current bedrock model and sends nothing when unchanged", async () => {
    const core = coreForUpdate();
    const current = currentHarness();
    current.harness!.model = {
      bedrockModelConfig: { modelId: "us.anthropic.claude-opus-4-8" },
    };
    core.harness.setGetResponse(current);
    const r = renderScreen("/agentcore/harness/update/MyHarness-abc123", { core });

    // The harness's model is one of the presets, so it is preselected.
    await waitForText(r.lastFrame, "● Claude Opus 4.8");
    await r.press("return"); // model unchanged
    await waitForText(r.lastFrame, "● Managed memory");
    await r.press("return");
    await waitForText(r.lastFrame, "[✓] Browser");
    await r.press("return");
    await waitForText(r.lastFrame, "System prompt");
    await r.write(" Now v2.");
    await r.write("\x04");
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("return");
    await waitForText(r.lastFrame, "Review");
    await r.press("return");

    await waitFor(() => core.harness.calls.some((c) => c.method === "updateHarness"));
    const call = core.harness.calls.find((c) => c.method === "updateHarness")!;
    expect(call.args[0]).toEqual({
      harnessId: "MyHarness-abc123",
      systemPrompt: [{ text: "You are v1. Now v2." }],
    });
    r.unmount();
  });

  test("changing the model submits a request with just that field", async () => {
    const core = coreForUpdate();
    const r = renderScreen("/agentcore/harness/update/MyHarness-abc123", { core });

    await waitForText(r.lastFrame, "● Keep current model");
    await r.press("up"); // Other
    await r.press("up"); // Haiku 4.5
    await waitForText(r.lastFrame, "● Claude Haiku 4.5");
    await r.press("return");
    await waitForText(r.lastFrame, "● Managed memory");
    await r.press("return");
    await waitForText(r.lastFrame, "[✓] Browser");
    await r.press("return");
    await waitForText(r.lastFrame, "System prompt");
    await r.write("\x04");
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("return");
    await waitForText(r.lastFrame, "Review");
    await r.press("return");

    await waitFor(() => core.harness.calls.some((c) => c.method === "updateHarness"));
    const call = core.harness.calls.find((c) => c.method === "updateHarness")!;
    expect(call.args[0]).toEqual({
      harnessId: "MyHarness-abc123",
      model: { bedrockModelConfig: { modelId: "us.anthropic.claude-haiku-4-5-20251001-v1:0" } },
    });
    r.unmount();
  });

  test("changing only the prompt submits a request with just that field", async () => {
    const core = coreForUpdate();
    const r = renderScreen("/agentcore/harness/update/MyHarness-abc123", { core });

    await waitForText(r.lastFrame, "● Keep current model");
    await r.press("return"); // model unchanged
    await waitForText(r.lastFrame, "● Managed memory");
    await r.press("return"); // memory unchanged
    await waitForText(r.lastFrame, "[✓] Browser");
    await r.press("return"); // tools unchanged
    await waitForText(r.lastFrame, "System prompt");
    expect(r.lastFrame()).toContain("You are v1.");
    await r.write(" Now v2."); // append to the existing prompt
    await r.write("\x04");
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("return"); // skip advanced
    await waitForText(r.lastFrame, "Review");
    expect(r.lastFrame()).toContain("Only the changed fields are sent");
    await r.press("return"); // update

    await waitForText(r.lastFrame, "Harness updated");
    expect(r.lastFrame()).toContain("version");

    const call = core.harness.calls.find((c) => c.method === "updateHarness")!;
    expect(call.args[0]).toEqual({
      harnessId: "MyHarness-abc123",
      systemPrompt: [{ text: "You are v1. Now v2." }],
    });
    r.unmount();
  });

  test("disabling memory sends the wrapped disabled configuration", async () => {
    const core = coreForUpdate();
    const r = renderScreen("/agentcore/harness/update/MyHarness-abc123", { core });

    await waitForText(r.lastFrame, "● Keep current model");
    await r.press("return"); // model unchanged
    await waitForText(r.lastFrame, "● Managed memory");
    await r.press("down"); // byo
    await r.press("down"); // disabled
    await waitForText(r.lastFrame, "● Disable memory");
    await r.press("return");
    await waitForText(r.lastFrame, "[✓] Browser");
    await r.press("return");
    await waitForText(r.lastFrame, "System prompt");
    await r.write("\x04");
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("return");
    await waitForText(r.lastFrame, "Review");
    await r.press("return");

    await waitFor(() => core.harness.calls.some((c) => c.method === "updateHarness"));
    const call = core.harness.calls.find((c) => c.method === "updateHarness")!;
    expect(call.args[0]).toEqual({
      harnessId: "MyHarness-abc123",
      memory: { optionalValue: { disabled: {} } },
    });
    r.unmount();
  });

  test("toggling a tool off keeps unmodeled tools in the replacement list", async () => {
    const core = coreForUpdate();
    const r = renderScreen("/agentcore/harness/update/MyHarness-abc123", { core });

    await waitForText(r.lastFrame, "● Keep current model");
    await r.press("return"); // model unchanged
    await waitForText(r.lastFrame, "● Managed memory");
    await r.press("return");
    await waitForText(r.lastFrame, "[✓] Browser");
    await r.write(" "); // toggle browser off
    await waitFor(() => (r.lastFrame() ?? "").includes("[ ] Browser"));
    await r.press("return");
    await waitForText(r.lastFrame, "System prompt");
    await r.write("\x04");
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("return");
    await waitForText(r.lastFrame, "Review");
    await r.press("return");

    await waitFor(() => core.harness.calls.some((c) => c.method === "updateHarness"));
    const call = core.harness.calls.find((c) => c.method === "updateHarness")!;
    // The inline_function tool the form doesn't model survives the update.
    expect(call.args[0]).toEqual({
      harnessId: "MyHarness-abc123",
      tools: [
        {
          type: "inline_function",
          name: "custom",
          config: { inlineFunction: { description: "d", inputSchema: {} } },
        },
      ],
    });
    r.unmount();
  });
});

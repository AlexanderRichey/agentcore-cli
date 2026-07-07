import { test, expect, describe, afterEach } from "bun:test";
import type { CreateHarnessResponse } from "@aws-sdk/client-bedrock-agentcore-control";
import {
  renderScreen,
  waitForText,
  waitFor,
  cleanupScreens,
  TestCoreClient,
} from "../../../testing";

afterEach(cleanupScreens);

// Behavior tests for the create-harness wizard: name → model → memory → tools
// → prompt → advanced → review → submit. Key input drives the whole flow;
// assertions check both what the user sees and the exact request Core receives.

const DEFAULT_MODEL = {
  bedrockModelConfig: { modelId: "us.anthropic.claude-sonnet-4-6" },
};

function coreForCreate(): TestCoreClient {
  const core = new TestCoreClient();
  core.harness.setCreateResponse({
    harness: {
      harnessId: "my_agent-Xyz12345",
      harnessName: "my_agent",
      status: "CREATING",
      harnessVersion: "1",
    },
  } as CreateHarnessResponse);
  return core;
}

describe("harness create wizard", () => {
  test("walks name → model → memory → tools → prompt → advanced → review and creates", async () => {
    const core = coreForCreate();
    const r = renderScreen("/agentcore/harness/create", { core });

    // Step: name.
    await waitForText(r.lastFrame, "What should this harness be called?");
    await r.write("my_agent");
    await r.press("return");

    // Step: model — Claude Sonnet 4.6 is preselected; keep it.
    await waitForText(r.lastFrame, "Which model should the agent use?");
    expect(r.lastFrame()).toContain("● Claude Sonnet 4.6");
    expect(r.lastFrame()).toContain("us.anthropic.claude-sonnet-4-6 (recommended)");
    await r.press("return");

    // Step: memory — managed is preselected; keep it.
    await waitForText(r.lastFrame, "How should the harness remember conversations?");
    expect(r.lastFrame()).toContain("● Managed memory");
    await r.press("return");

    // Step: tools — enable Browser, then set a Gateway ARN.
    await waitForText(r.lastFrame, "Which tools should the agent be able to use?");
    await r.write(" "); // toggle browser on
    await waitForText(r.lastFrame, "[✓] Browser");
    await r.press("down"); // code interpreter
    await r.press("down"); // gateway
    await r.write(" "); // opens the arn input
    await waitForText(r.lastFrame, "gateway arn");
    await r.write("arn:aws:bedrock-agentcore:us-east-1:123:gateway/g-1");
    await r.press("return"); // commit the arn
    await waitForText(r.lastFrame, "arn:aws:bedrock-agentcore:us-east-1:123:gateway/g-1");
    await r.press("return"); // continue

    // Step: prompt — type a prompt with a newline, then ctrl+d.
    await waitForText(r.lastFrame, "System prompt");
    await r.write("You are helpful.");
    await r.press("return"); // newline
    await r.write("Be brief.");
    await r.write("\x04"); // ctrl+d continues

    // Step: advanced — skip (recommended) is preselected.
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("return");

    // Step: review — the request is shown as JSON.
    await waitForText(r.lastFrame, "Review");
    expect(r.lastFrame()).toContain('"harnessName"');
    await r.press("return"); // create

    await waitForText(r.lastFrame, "Harness created");
    expect(r.lastFrame()).toContain("my_agent-Xyz12345");

    const call = core.harness.calls.find((c) => c.method === "createHarness")!;
    expect(call.args[0]).toEqual({
      harnessName: "my_agent",
      model: DEFAULT_MODEL,
      memory: { managedMemoryConfiguration: {} },
      tools: [
        { type: "agentcore_browser", config: { agentCoreBrowser: {} } },
        {
          type: "agentcore_gateway",
          config: {
            agentCoreGateway: {
              gatewayArn: "arn:aws:bedrock-agentcore:us-east-1:123:gateway/g-1",
            },
          },
        },
      ],
      systemPrompt: [{ text: "You are helpful.\nBe brief." }],
    });

    // Enter moves on to the new harness's hub.
    await r.press("return");
    await waitForText(r.lastFrame, "agentcore → harness → get → my_agent-Xyz12345");
    r.unmount();
  });

  test("picking a different preset model sends that model", async () => {
    const core = coreForCreate();
    const r = renderScreen("/agentcore/harness/create", { core });

    await waitForText(r.lastFrame, "What should this harness be called?");
    await r.write("my_agent");
    await r.press("return");

    await waitForText(r.lastFrame, "Which model should the agent use?");
    await r.press("down"); // Sonnet 5
    await r.press("down"); // Opus 4.8
    await waitForText(r.lastFrame, "● Claude Opus 4.8");
    await r.press("return");

    await waitForText(r.lastFrame, "How should the harness remember conversations?");
    await r.press("return");
    await waitForText(r.lastFrame, "Which tools should the agent be able to use?");
    await r.press("return");
    await waitForText(r.lastFrame, "System prompt");
    await r.write("\x04");
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("return");
    await waitForText(r.lastFrame, "Review");
    await r.press("return");

    await waitFor(() => core.harness.calls.some((c) => c.method === "createHarness"));
    const call = core.harness.calls.find((c) => c.method === "createHarness")!;
    expect(call.args[0]).toEqual({
      harnessName: "my_agent",
      model: { bedrockModelConfig: { modelId: "us.anthropic.claude-opus-4-8" } },
      memory: { managedMemoryConfiguration: {} },
    });
    r.unmount();
  });

  test("Other requires a model ID and sends the entered one", async () => {
    const core = coreForCreate();
    const r = renderScreen("/agentcore/harness/create", { core });

    await waitForText(r.lastFrame, "What should this harness be called?");
    await r.write("my_agent");
    await r.press("return");

    await waitForText(r.lastFrame, "Which model should the agent use?");
    await r.press("down"); // Sonnet 5
    await r.press("down"); // Opus 4.8
    await r.press("down"); // Haiku 4.5
    await r.press("down"); // Other
    await waitForText(r.lastFrame, "● Other");
    await r.press("return"); // empty → error
    await waitForText(r.lastFrame, "Enter a Bedrock model or inference profile ID.");
    await r.write("eu.anthropic.claude-sonnet-4-6");
    await r.press("return");

    await waitForText(r.lastFrame, "How should the harness remember conversations?");
    await r.press("return");
    await waitForText(r.lastFrame, "Which tools should the agent be able to use?");
    await r.press("return");
    await waitForText(r.lastFrame, "System prompt");
    await r.write("\x04");
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("return");
    await waitForText(r.lastFrame, "Review");
    await r.press("return");

    await waitFor(() => core.harness.calls.some((c) => c.method === "createHarness"));
    const call = core.harness.calls.find((c) => c.method === "createHarness")!;
    expect(call.args[0]).toEqual({
      harnessName: "my_agent",
      model: { bedrockModelConfig: { modelId: "eu.anthropic.claude-sonnet-4-6" } },
      memory: { managedMemoryConfiguration: {} },
    });
    r.unmount();
  });

  test("service default sends no model", async () => {
    const core = coreForCreate();
    const r = renderScreen("/agentcore/harness/create", { core });

    await waitForText(r.lastFrame, "What should this harness be called?");
    await r.write("my_agent");
    await r.press("return");

    await waitForText(r.lastFrame, "Which model should the agent use?");
    await r.press("down"); // Sonnet 5
    await r.press("down"); // Opus 4.8
    await r.press("down"); // Haiku 4.5
    await r.press("down"); // Other
    await r.press("down"); // Service default
    await waitForText(r.lastFrame, "● Service default");
    await r.press("return");

    await waitForText(r.lastFrame, "How should the harness remember conversations?");
    await r.press("return");
    await waitForText(r.lastFrame, "Which tools should the agent be able to use?");
    await r.press("return");
    await waitForText(r.lastFrame, "System prompt");
    await r.write("\x04");
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("return");
    await waitForText(r.lastFrame, "Review");
    await r.press("return");

    await waitFor(() => core.harness.calls.some((c) => c.method === "createHarness"));
    const call = core.harness.calls.find((c) => c.method === "createHarness")!;
    expect(call.args[0]).toEqual({
      harnessName: "my_agent",
      memory: { managedMemoryConfiguration: {} },
    });
    r.unmount();
  });

  test("rejects an invalid name and stays on the name step", async () => {
    const r = renderScreen("/agentcore/harness/create", { core: coreForCreate() });

    await waitForText(r.lastFrame, "What should this harness be called?");
    await r.write("9bad name");
    await r.press("return");
    await waitForText(r.lastFrame, "Must start with a letter");
    r.unmount();
  });

  test("bring-your-own memory requires an ARN", async () => {
    const core = coreForCreate();
    const r = renderScreen("/agentcore/harness/create", { core });

    await waitForText(r.lastFrame, "What should this harness be called?");
    await r.write("my_agent");
    await r.press("return");
    await waitForText(r.lastFrame, "Which model should the agent use?");
    await r.press("return");

    await waitForText(r.lastFrame, "How should the harness remember conversations?");
    await r.press("down"); // bring your own
    await waitForText(r.lastFrame, "● Bring your own");
    await r.press("return"); // no arn yet → error
    await waitForText(r.lastFrame, "Enter the ARN");
    await r.write("arn:aws:bedrock-agentcore:us-east-1:123:memory/m-1");
    await r.press("return");

    // Skip through tools/prompt/advanced to review.
    await waitForText(r.lastFrame, "Which tools should the agent be able to use?");
    await r.press("return");
    await waitForText(r.lastFrame, "System prompt");
    await r.write("\x04");
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("return");
    await waitForText(r.lastFrame, "Review");
    await r.press("return");

    await waitFor(() => core.harness.calls.some((c) => c.method === "createHarness"));
    const call = core.harness.calls.find((c) => c.method === "createHarness")!;
    expect(call.args[0]).toEqual({
      harnessName: "my_agent",
      model: DEFAULT_MODEL,
      memory: {
        agentCoreMemoryConfiguration: {
          arn: "arn:aws:bedrock-agentcore:us-east-1:123:memory/m-1",
        },
      },
    });
    r.unmount();
  });

  test("advanced options set the execution role and limits", async () => {
    const core = coreForCreate();
    const r = renderScreen("/agentcore/harness/create", { core });

    await waitForText(r.lastFrame, "What should this harness be called?");
    await r.write("my_agent");
    await r.press("return");
    await waitForText(r.lastFrame, "Which model should the agent use?");
    await r.press("return");
    await waitForText(r.lastFrame, "How should the harness remember conversations?");
    await r.press("return");
    await waitForText(r.lastFrame, "Which tools should the agent be able to use?");
    await r.press("return");
    await waitForText(r.lastFrame, "System prompt");
    await r.write("\x04");

    // Configure instead of skipping.
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("down");
    await r.press("return");
    await waitForText(r.lastFrame, "execution role");

    // Edit the execution role (first field).
    await r.press("return");
    await waitForText(r.lastFrame, "enter to save");
    await r.write("arn:aws:iam::123:role/Custom");
    await r.press("return");
    await waitForText(r.lastFrame, "arn:aws:iam::123:role/Custom");

    // Move to max iterations and set it.
    await r.press("down"); // network mode
    await r.press("down"); // environment vars
    await r.press("down"); // max iterations
    await r.press("return");
    await r.write("42");
    await r.press("return");

    // Done — continue is the last row.
    await r.press("down"); // max tokens
    await r.press("down"); // timeout seconds
    await r.press("down"); // done
    await r.press("return");

    await waitForText(r.lastFrame, "Review");
    await r.press("return");
    await waitFor(() => core.harness.calls.some((c) => c.method === "createHarness"));

    const call = core.harness.calls.find((c) => c.method === "createHarness")!;
    expect(call.args[0]).toEqual({
      harnessName: "my_agent",
      executionRoleArn: "arn:aws:iam::123:role/Custom",
      model: DEFAULT_MODEL,
      memory: { managedMemoryConfiguration: {} },
      maxIterations: 42,
    });
    r.unmount();
  });

  test("shows the service error and returns to the form on esc", async () => {
    const core = coreForCreate();
    core.harness.createHarness = async () => {
      throw new Error("name already exists");
    };
    const r = renderScreen("/agentcore/harness/create", { core });

    await waitForText(r.lastFrame, "What should this harness be called?");
    await r.write("my_agent");
    await r.press("return");
    await waitForText(r.lastFrame, "Which model should the agent use?");
    await r.press("return");
    await waitForText(r.lastFrame, "How should the harness remember conversations?");
    await r.press("return");
    await waitForText(r.lastFrame, "Which tools should the agent be able to use?");
    await r.press("return");
    await waitForText(r.lastFrame, "System prompt");
    await r.write("\x04");
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("return");
    await waitForText(r.lastFrame, "Review");
    await r.press("return");

    await waitForText(r.lastFrame, "name already exists");
    await r.press("escape");
    await waitForText(r.lastFrame, "Review");
    r.unmount();
  });

  test("esc from the hub after creating returns to the menu, not the wizard", async () => {
    const core = coreForCreate();
    core.harness.setGetResponse({
      harness: {
        harnessId: "my_agent-Xyz12345",
        harnessName: "my_agent",
        arn: "arn:aws:bedrock-agentcore:us-east-1:123:harness/my_agent-Xyz12345",
        executionRoleArn: "arn:aws:iam::123:role/MyRole",
        status: "READY",
      },
    } as never);
    const r = renderScreen("/agentcore/harness/create", { core });

    // Fastest path through the wizard: defaults everywhere.
    await waitForText(r.lastFrame, "What should this harness be called?");
    await r.write("my_agent");
    await r.press("return");
    await waitForText(r.lastFrame, "Which model should the agent use?");
    await r.press("return");
    await waitForText(r.lastFrame, "How should the harness remember conversations?");
    await r.press("return");
    await waitForText(r.lastFrame, "Which tools should the agent be able to use?");
    await r.press("return");
    await waitForText(r.lastFrame, "System prompt");
    await r.write("\x04");
    await waitForText(r.lastFrame, "Skip — use the defaults (recommended)");
    await r.press("return");
    await waitForText(r.lastFrame, "Review");
    await r.press("return");
    await waitForText(r.lastFrame, "Harness created");
    await r.press("return"); // on to the hub
    await waitForText(r.lastFrame, "arn:aws:iam::123:role/MyRole");

    // Esc from the hub: the finished wizard must not come back.
    await r.press("escape");
    await waitForText(r.lastFrame, "manage agentcore harnesses");
    expect(r.lastFrame()).not.toContain("What should this harness be called?");
    r.unmount();
  });

  test("esc on the first step leaves the wizard", async () => {
    const core = coreForCreate();
    core.harness.setListResponse({ harnesses: [] });
    // Arrive from the harness menu so esc has somewhere to pop back to.
    const r = renderScreen("/agentcore/harness", { core });
    await waitForText(r.lastFrame, "❯ get");
    await r.press("down"); // list
    await r.press("down"); // create
    await waitForText(r.lastFrame, "❯ create");
    await r.press("return");
    await waitForText(r.lastFrame, "What should this harness be called?");

    await r.press("escape");
    await waitForText(r.lastFrame, "manage agentcore harnesses");
    r.unmount();
  });
});

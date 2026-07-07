import { test, expect, describe, afterEach } from "bun:test";
import { renderScreen, waitForText, cleanupScreens, TestCoreClient } from "../../testing";

afterEach(cleanupScreens);

// The create/update/delete/exec harness screens are stubs: each renders a
// TODO placeholder and pops back on esc. These tests lock in that behavior (and
// will need updating as each screen is built out).

const STUBS = [
  "create",
  "update",
  "delete",
  "exec",
  "create-endpoint",
  "get-endpoint",
  "list-endpoints",
  "update-endpoint",
  "delete-endpoint",
  "get-version",
  "list-versions",
] as const;

describe("harness stub screens", () => {
  for (const stub of STUBS) {
    test(`\`${stub}\` renders its breadcrumb and a TODO placeholder`, async () => {
      const r = renderScreen(`/agentcore/harness/${stub}`);
      await waitForText(r.lastFrame, "TODO");
      expect(r.lastFrame()).toContain(`agentcore → harness → ${stub}`);
      r.unmount();
    });
  }

  test("esc pops back to the previous screen", async () => {
    // Arrive at a stub by navigating from the harness menu so there is history
    // to pop (the stub's esc uses navigate(-1)). Selecting the first option
    // (get) would route to the detail screen, so pick the second (list)... but
    // list isn't a stub. Instead navigate down to "create" (index 2) with arrows,
    // which is deterministic and needs no filtering.
    const r = renderScreen("/agentcore/harness", { core: new TestCoreClient() });
    await waitForText(r.lastFrame, "❯ get");

    await r.press("down"); // list
    await waitForText(r.lastFrame, "❯ list");
    await r.press("down"); // create
    await waitForText(r.lastFrame, "❯ create");
    await r.press("return");
    await waitForText(r.lastFrame, "TODO");
    expect(r.lastFrame()).toContain("agentcore → harness → create");

    // Esc returns to the harness menu.
    await r.press("escape");
    await waitForText(r.lastFrame, "create a harness");
    expect(r.lastFrame()).toContain("manage agentcore harnesses");
    r.unmount();
  });
});

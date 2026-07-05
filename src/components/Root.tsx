import type { Core } from "../handlers/types.tsx";
import { MemoryRouter, Route, Routes } from "react-router";
import { HarnessScreen } from "../handlers/harness/screen.tsx";
import { HarnessGetScreen } from "../handlers/harness/get/screen.tsx";
import { HarnessListScreen } from "../handlers/harness/list/screen.tsx";
import { RootScreen, HelpScreen } from "../handlers/screen.tsx";
import type { Context } from "../router";

export interface RootProps {
  // path is the command path to the executing node (e.g. "/agentcore").
  path: string;
  // core carries the injected service clients for use by the TUI.
  core: Core;

  ctx: Context;
}

// Root is the top of the Ink React tree, rendered by the `agentcore` default
// handler when the CLI is invoked without a subcommand.
export function Root({ path, ctx }: RootProps) {
  return (
    <MemoryRouter>
      <Routes location={path}>
        <Route path="agentcore" element={<RootScreen />} />
        <Route path="agentcore/harness" element={<HarnessScreen />} />
        <Route path="agentcore/harness/get" element={<HarnessGetScreen />} />
        <Route path="agentcore/harness/list" element={<HarnessListScreen />} />
        <Route path="*" element={<HelpScreen ctx={ctx} />} />
      </Routes>
    </MemoryRouter>
  );
}

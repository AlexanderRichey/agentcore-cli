import { useState } from "react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Core } from "../handlers/types.tsx";
import { HarnessScreen } from "../handlers/harness/screen.tsx";
import { HarnessGetScreen } from "../handlers/harness/get/screen.tsx";
import { HarnessListScreen } from "../handlers/harness/list/screen.tsx";
import { HarnessCreateScreen } from "../handlers/harness/create/screen.tsx";
import { HarnessUpdateScreen } from "../handlers/harness/update/screen.tsx";
import { HarnessDeleteScreen } from "../handlers/harness/delete/screen.tsx";
import { HarnessInvokeScreen } from "../handlers/harness/invoke/screen.tsx";
import { HarnessExecScreen } from "../handlers/harness/exec/screen.tsx";
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
export function Root({ path, ctx, core }: RootProps) {
  // Create the QueryClient once per mount; a lazy initializer keeps it stable
  // across re-renders (a fresh client would drop the cache and refetch).
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {/* initialEntries seeds the in-memory history with the CLI command path,
          then leaves navigation to the router so screens can useNavigate. */}
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="agentcore" element={<RootScreen ctx={ctx} core={core} />} />
          <Route path="agentcore/harness" element={<HarnessScreen ctx={ctx} core={core} />} />
          {/* Bare `get` (no id) has nothing to show — send the user to the list. */}
          <Route
            path="agentcore/harness/get"
            element={<Navigate to="/agentcore/harness/list" replace />}
          />
          <Route
            path="agentcore/harness/get/:harnessId"
            element={<HarnessGetScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/list"
            element={<HarnessListScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/create"
            element={<HarnessCreateScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/update"
            element={<HarnessUpdateScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/delete"
            element={<HarnessDeleteScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/invoke"
            element={<HarnessInvokeScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/exec"
            element={<HarnessExecScreen ctx={ctx} core={core} />}
          />
          <Route path="*" element={<HelpScreen ctx={ctx} core={core} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

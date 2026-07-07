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
import { HarnessCreateEndpointScreen } from "../handlers/harness/create-endpoint/screen.tsx";
import { HarnessGetEndpointScreen } from "../handlers/harness/get-endpoint/screen.tsx";
import { HarnessListEndpointsScreen } from "../handlers/harness/list-endpoints/screen.tsx";
import { HarnessUpdateEndpointScreen } from "../handlers/harness/update-endpoint/screen.tsx";
import { HarnessDeleteEndpointScreen } from "../handlers/harness/delete-endpoint/screen.tsx";
import { HarnessGetVersionsScreen } from "../handlers/harness/get-versions/screen.tsx";
import { HarnessListVersionsScreen } from "../handlers/harness/list-versions/screen.tsx";
import { RootScreen, HelpScreen } from "../handlers/screen.tsx";
import type { Context } from "../router";

export interface RootProps {
  // path is the command path to the executing node (e.g. "/agentcore").
  path: string;
  // core carries the injected service clients for use by the TUI.
  core: Core;

  ctx: Context;

  // queryClient is an optional override for the react-query client. Production
  // leaves it unset (a stable one is created per mount); tests inject one — e.g.
  // with retries disabled — to keep behavior deterministic and fast.
  queryClient?: QueryClient;
}

// Root is the top of the Ink React tree, rendered by the `agentcore` default
// handler when the CLI is invoked without a subcommand.
export function Root({ path, ctx, core, queryClient }: RootProps) {
  // Create the QueryClient once per mount; a lazy initializer keeps it stable
  // across re-renders (a fresh client would drop the cache and refetch). An
  // injected client (tests) takes precedence.
  const [defaultQueryClient] = useState(() => new QueryClient());
  const client = queryClient ?? defaultQueryClient;

  return (
    <QueryClientProvider client={client}>
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
            path="agentcore/harness/invoke/:harnessId"
            element={<HarnessInvokeScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/exec"
            element={<HarnessExecScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/create-endpoint"
            element={<HarnessCreateEndpointScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/get-endpoint"
            element={<HarnessGetEndpointScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/list-endpoints"
            element={<HarnessListEndpointsScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/update-endpoint"
            element={<HarnessUpdateEndpointScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/delete-endpoint"
            element={<HarnessDeleteEndpointScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/get-versions"
            element={<HarnessGetVersionsScreen ctx={ctx} core={core} />}
          />
          <Route
            path="agentcore/harness/list-versions"
            element={<HarnessListVersionsScreen ctx={ctx} core={core} />}
          />
          <Route path="*" element={<HelpScreen ctx={ctx} core={core} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

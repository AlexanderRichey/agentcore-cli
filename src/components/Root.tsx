import { useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Core } from "../handlers/types.tsx";
import { AppFrame } from "./AppFrame.tsx";
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
export function Root({ path, ctx, core }: RootProps) {
  // Create the QueryClient once per mount; a lazy initializer keeps it stable
  // across re-renders (a fresh client would drop the cache and refetch).
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppFrame>
          <Routes location={path}>
            <Route path="agentcore" element={<RootScreen ctx={ctx} core={core} />} />
            <Route path="agentcore/harness" element={<HarnessScreen ctx={ctx} core={core} />} />
            <Route
              path="agentcore/harness/get"
              element={<HarnessGetScreen ctx={ctx} core={core} />}
            />
            <Route
              path="agentcore/harness/list"
              element={<HarnessListScreen ctx={ctx} core={core} />}
            />
            <Route path="*" element={<HelpScreen ctx={ctx} core={core} />} />
          </Routes>
        </AppFrame>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

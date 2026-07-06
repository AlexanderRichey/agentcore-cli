import type { CoreHarnessClient } from "./harness/types.tsx";
import type { Context } from "../router";

export interface Core {
  harness: CoreHarnessClient;
}

// ScreenProps is the common prop set every TUI screen receives. `ctx` carries the
// request context (resolved flags, command, path) and `core` the service clients,
// both threaded down by Root.
export interface ScreenProps {
  ctx: Context;
  core: Core;
}

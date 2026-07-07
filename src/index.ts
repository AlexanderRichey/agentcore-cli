#!/usr/bin/env node

// The shebang above is preserved by the bundler into dist/index.js, making the
// published `bin` directly executable by Node. It's ignored during development
// when the file is run via `bun run src/index.ts`.

import { CoreClient } from "./core";
import { createControlClient, createDataClient } from "./core/factories";
import { createRootHandler } from "./handlers";
import { runWithExitCode } from "./runnable";

process.exit(
  await runWithExitCode(async (argv: string[]) => {
    // Wrap the SDK clients in the CoreClient the handlers consume. Passing
    // factories (rather than instances) lets CoreClient build one client per
    // region on demand.
    const coreClient = new CoreClient(createControlClient, createDataClient);

    // Pass it to the root handler, along with the process's standard streams as
    // the app's io. CoreClient exposes feature sub-clients (e.g. `.harness`), so
    // it satisfies the Core contract directly.
    const rootHandler = createRootHandler(coreClient, {
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
    });

    // Handle the request
    await rootHandler.route(argv);
  }),
);

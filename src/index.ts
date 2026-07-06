#!/usr/bin/env node

// The shebang above is preserved by the bundler into dist/index.js, making the
// published `bin` directly executable by Node. It's ignored during development
// when the file is run via `bun run src/index.ts`.

import { CoreClient } from "./core";
import { createControlClient, createDataClient, createIamClient } from "./core/factories";
import { createRootHandler } from "./handlers";
import { createRootLogger } from "./logging";
import { runWithExitCode } from "./runnable";

process.exit(
  await runWithExitCode(async (argv: string[]) => {
    // generate a unique identifier corresponding to this process of this CLI. (ex. one command invoke, one TUI session)
    const cliProcessId = crypto.randomUUID();

    // TODO: memoize this
    const getLogger = () => createRootLogger({ bindings: { processId: cliProcessId } });

    // Wrap the SDK clients in the CoreClient the handlers consume. Passing
    // factories (rather than instances) lets CoreClient build one client per
    // region on demand.
    const coreClient = new CoreClient(createControlClient, createDataClient, createIamClient);

    // Pass it to the root handler, along with the process's standard streams as
    // the app's io. CoreClient exposes feature sub-clients (e.g. `.harness`), so
    // it satisfies the Core contract directly.
    const rootHandler = createRootHandler(coreClient, {
      io: {
        stdin: process.stdin,
        stdout: process.stdout,
        stderr: process.stderr,
      },
      getLogger,
    });

    // Handle the request
    await rootHandler.route(argv);
  }),
);

#!/usr/bin/env node

// The shebang above is preserved by the bundler into dist/index.js, making the
// published `bin` directly executable by Node. It's ignored during development
// when the file is run via `bun run src/index.ts`.

import { CoreClient } from "./core";
import {
  createControlClient,
  createDataClient,
  createIamClient,
  createStsClient,
} from "./core/factories";
import { StsClient } from "./core/sts";
import { LocalProjectAccessor } from "./core/project";
import { getDefaultFs } from "./env";
import { createRootHandler } from "./handlers";
import { runWithExitCode } from "./runnable";

process.exit(
  await runWithExitCode(async (argv: string[]) => {
    // Wrap the SDK clients in the CoreClient the handlers consume. Passing
    // factories (rather than instances) lets CoreClient build one client per
    // region on demand.
    const coreClient = new CoreClient(
      createControlClient,
      createDataClient,
      createIamClient,
      createStsClient,
    );

    const io = {
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
    };

    const projectAccessor = new LocalProjectAccessor({
      env: {
        fs: getDefaultFs(),
        getCurrentDirectory: () => process.cwd(),
      },
    });

    // Pass it to the root handler, along with the process's standard streams as
    // the app's io.
    const core = {
      harness: coreClient.harness,
      projectAccessor,
      sts: new StsClient(coreClient),
    };

    const rootHandler = createRootHandler(core, io);

    // Handle the request
    await rootHandler.route(argv);
  }),
);

#!/usr/bin/env node

// The shebang above is preserved by the bundler into dist/index.js, making the
// published `bin` directly executable by Node. It's ignored during development
// when the file is run via `bun run src/index.ts`.

import { HarnessClient } from "./core";
import { createRootHandler } from "./handlers";
import { runWithExitCode } from "./runnable";

process.exit(
  await runWithExitCode(async (argv: string[]) => {
    await createRootHandler({
      harness: new HarnessClient(),
      // Other clients...
    }).route(argv);
  }),
);

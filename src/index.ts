#!/usr/bin/env node

// The shebang above is preserved by the bundler into dist/index.js, making the
// published `bin` directly executable by Node. It's ignored during development
// when the file is run via `bun run src/index.ts`.

import { BedrockAgentCoreControlClient } from "@aws-sdk/client-bedrock-agentcore-control";
import { BedrockAgentCoreClient } from "@aws-sdk/client-bedrock-agentcore";

import { CoreClient } from "./core";
import { createRootHandler } from "./handlers";
import { runWithExitCode } from "./runnable";

process.exit(
  await runWithExitCode(async (argv: string[]) => {
    // Wrap the SDK clients in the CoreClient the handlers consume. Passing
    // factories (rather than instances) lets CoreClient build one client per
    // region on demand.
    const coreClient = new CoreClient(
      (config) => new BedrockAgentCoreControlClient({ ...config }),
      (config) => new BedrockAgentCoreClient({ ...config }),
    );

    // Pass it to the root handler. CoreClient exposes feature sub-clients (e.g.
    // `.harness`), so it satisfies the Core contract directly.
    const rootHandler = createRootHandler(coreClient);

    // Handle the request
    await rootHandler.route(argv);
  }),
);

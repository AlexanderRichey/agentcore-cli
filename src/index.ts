#!/usr/bin/env node

// The shebang above is preserved by the bundler into dist/index.js, making the
// published `bin` directly executable by Node. It's ignored during development
// when the file is run via `bun run src/index.ts`.

import { App } from "./app";
import { runRunnable } from "./runnable";

process.exit(runRunnable(() => new App()));

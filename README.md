# AgentCore CLI

## Patterns

This section documents the architectural conventions the codebase is built
around. They exist to keep the app modular, testable, and predictable as it
grows.

### The Router / Handler framework

The whole CLI is expressed as a tree of **`Handler`** nodes wired together by a
**`Router`** (`src/router/`). A `Router` is itself a mountable branch node, so
routers nest to form the command tree (`agentcore` → `harness` → `get`). Every
command — branch or leaf — is a `Handler`:

- **Branch nodes** (routers) host subcommands and may declare group-level
  ("global") flags and middleware that apply to everything beneath them. A
  branch can also register a **default handler** (`router.default(...)`) that
  runs when the branch is invoked with no subcommand (e.g. bare `agentcore` or
  `agentcore harness` — this is how the TUI launches).
- **Leaf nodes** (built with `createHandler(...)`) do the work. They declare
  their own flags/arguments (validated and coerced via zod schemas) and receive
  a typed object in `handle(ctx, flags, args)`.

Cross-cutting values flow through a typed **`Context`**. Group-level flags
(`globalFlag(...)`) double as context keys, so a flag declared high in the tree
is read type-safely by any descendant via `ctx.value(key)` / `ctx.require(key)`.
**Middleware** (`router.use(...)`) wraps handlers down the subtree in
ancestor-first order — for example `withRegion` resolves the effective AWS
region once at the root and pins it on the context for every command below.

### Adding a new handler

Each command lives in its own directory with a consistent file layout. Using
`harness` as the model:

```
src/handlers/harness/
  index.tsx      # createHarnessHandler(core): builds the Router/Handler, wires
                 #   subcommands, middleware, flags, and the default handler
  screen.tsx     # the Ink/React screen(s) rendered for this command in the TUI
  types.tsx      # the interface(s) this command consumes from Core (see below)
  get/           # a subcommand, same layout recursively
    index.tsx
    screen.tsx
  list/
    index.tsx
    screen.tsx
```

Conventions:

- **`index.tsx`** exports a `create<Name>Handler(core)` factory returning a
  `Handler`/`Router`. Dependencies (the `Core` client) are passed in, never
  imported as singletons. Re-export the command's `screen.tsx` from here.
- **`screen.tsx`** exports the React component(s) for the TUI. Screens receive
  `ScreenProps` (`{ ctx, core }`) threaded down from `Root`, and drive data
  fetching with react-query against `core`.
- **`types.tsx`** defines the interface(s) this command needs from Core.
- Shared helpers live in a sibling `utils.tsx` (e.g. `coreOptsFromCtx(ctx)`
  builds the standard `CoreOptions` from context values).

Mount the new handler by adding `root.handler(create<Name>Handler(core))` in
`src/handlers/index.tsx` (or on the appropriate parent router).

### Core and dependency inversion

Business logic and all I/O (AWS SDK calls, etc.) live in **`src/core/`**, behind
a `CoreClient` that exposes feature-scoped sub-clients (e.g. `core.harness`).
The important rule: **interfaces are defined by their consumers, not by Core.**

The `CoreHarnessClient` interface lives in `src/handlers/harness/types.tsx` —
next to the handler that uses it — and `src/core/harness.tsx` provides the
implementation. Handlers depend on the interface they declare; Core depends on
nothing about the handlers. This is **dependency inversion**: the
high-level policy (handlers) owns the abstraction, and the low-level detail
(Core/SDK) conforms to it.

Construction is also inverted. `CoreClient` doesn't build SDK clients directly;
it takes **factory functions** (`(config) => new BedrockAgentCore...Client(...)`)
injected at the app edge in `src/index.ts`. That keeps the SDK swappable —
crucial for the testing strategy below.

### Tests live beside source

Tests sit next to the code they cover as `<file>.test.tsx` (e.g.
`src/router/router.test.ts`), run with `bun test`.

We have not written the application-level tests yet, but the strategy the app is
structured around is **dependency injection end to end**. Because every
dependency is injected at the edges (Core client factories in `src/index.ts`,
`core`/`ctx` threaded through handlers and screens), a test can construct the
whole CLI with mocked dependencies at the boundary and exercise a real command
flow — argument parsing, middleware, handler, and Core — as a single unit,
asserting on the output. The seams already exist; the tests will plug into them.

## Development

Install [Bun](https://bun.com).

```bash
brew install oven-sh/bun/bun
```

Install dependencies:

```bash
bun install
```

Run from source:

```bash
bun run start
```

Run tests:

```bash
bun test
```

### Run Locally

Build, then symlink the `agentcore` command globally so it works from any directory:

```bash
bun run build
npm link
```

Re-run `bun run build` after changes; the linked command picks it up. Remove with:

```bash
npm unlink -g agentcore
```

To test the exact published artifact instead:

```bash
npm pack                          # builds via prepublishOnly, creates the .tgz
npm i -g ./agentcore-1.0.0.tgz
```

## Build

Run `make` to verify bun is installed, build the Node bundle, and compile all native binaries:

```bash
make          # check-bun -> build -> compile (all platforms)
make bundle    # node bundle only (dist/index.js)
make compile  # native binaries only (dist/bin/)
make clean    # remove dist/
```

`make` errors out early if bun is not installed.

Bundle the CLI into `dist/` for distribution. The bundle targets Node.js and is the artifact published to npm (via the `bin` entry):

```bash
make bundle
```

The output (`dist/index.js`) can be run directly with Node:

```bash
node dist/index.js
```

### Native binaries

Compile standalone executables (Bun runtime embedded; no Node/Bun required to run) for all platforms into `dist/bin/`:

```bash
make compile
```

Targets (build individually with `bun run compile:<target>`):

| Script                  | Output                        |
| ----------------------- | ----------------------------- |
| `compile:darwin-x64`    | `agentcore-darwin-x64`        |
| `compile:darwin-arm64`  | `agentcore-darwin-arm64`      |
| `compile:linux-x64`     | `agentcore-linux-x64`         |
| `compile:linux-arm64`   | `agentcore-linux-arm64`       |
| `compile:windows-x64`   | `agentcore-windows-x64.exe`   |
| `compile:windows-arm64` | `agentcore-windows-arm64.exe` |

Each binary is ~60–95MB (embedded runtime).

## Formatting

Format all files with Prettier:

```bash
bun run format        # write changes
bun run format:check  # check only
```

A Husky pre-commit hook runs Prettier (via lint-staged) on staged files automatically. It installs on `bun install`.

## Next Steps

- **Flesh out the TUI.** The framework is in place (full-screen Ink app,
  react-router screens, react-query, InkUI components), but most screens are
  still placeholders. The harness detail view in particular is currently a TODO
  and needs a workable, scrollable renderer.
- **Golden-file testing.** Build a robust testing pattern with two modes. In
  "record" mode the test suite calls the live AWS APIs and saves the responses
  as test **fixtures** (golden files). Every other run replays those fixtures
  instead of hitting the network, so the suite is fast, deterministic, and
  runnable offline/in CI. This plugs directly into the dependency-injection
  seams described in [Patterns](#patterns): the recorded fixtures are injected
  in place of the real Core client factories, letting us test the whole command
  flow end to end against known-good data. Fixtures are refreshed by re-running
  in record mode when the APIs or expected output change. See [this talk](https://www.youtube.com/watch?v=yszygk1cpEc&t=1s) for background.

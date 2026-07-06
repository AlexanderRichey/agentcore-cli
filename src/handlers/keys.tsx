import z from "zod";
import { globalFlag } from "../router";

// These keys are group-level flags declared on the root router. Because a
// GlobalFlag is also a typed ContextKey, handlers read its validated value back
// out of the context via `ctx.value(Key)`.

// RegionKey has no default: an omitted --region must resolve to undefined so the
// withRegion middleware can fall back to AWS_REGION / the shared config file.
export const RegionKey = globalFlag("region", "AWS region", z.string().optional());

export const DebugKey = globalFlag("debug", "debug logging", z.boolean().default(false));

// "disable-color" instead of "no-color" because Commander.js interprets --no-X
// as the negation of a --X flag, making --no-color silently non-functional.
export const NoColorKey = globalFlag(
  "disable-color",
  "disable color output",
  z.boolean().default(false),
);

export const JsonKey = globalFlag("json", "JSON output", z.boolean().default(false));

export const EndpointKey = globalFlag(
  "endpoint-url",
  "endpoint URL override",
  z.string().optional(),
);

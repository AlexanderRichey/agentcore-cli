import z from "zod";
import { globalFlag } from "../router";

// These keys are group-level flags declared on the root router. Because a
// GlobalFlag is also a typed ContextKey, handlers read its validated value back
// out of the context via `ctx.value(Key)`.

export const RegionKey = globalFlag("region", "AWS region", z.string().default("us-east-1"));

export const DebugKey = globalFlag("debug", "debug logging", z.boolean().default(false));

export const JsonKey = globalFlag("json", "JSON output", z.boolean().default(false));

export const EndpointKey = globalFlag(
  "endpoint-url",
  "endpoint URL override",
  z.string().optional(),
);

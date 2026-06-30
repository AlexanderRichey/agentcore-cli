import z from "zod";
import { globalFlag } from "../router";

// RegionKey is a group-level flag declared on the root router. Because a
// GlobalFlag is also a typed ContextKey, handlers read its validated value back
// out of the context via `ctx.value(RegionKey)`.
export const RegionKey = globalFlag("region", "AWS region", z.string().default("us-east-1"));

import type { Context } from "../router";
import type { CoreOptions } from "../core/types";
import { EndpointKey, RegionKey } from "./keys";

// coreOptsFromCtx builds the standard CoreOptions handed to Core operations from
// the values pinned on the context: the resolved region (always present, see the
// withRegion middleware) and the optional --endpoint-url override. Shared by every
// handler that calls into a Core sub-client.
export function coreOptsFromCtx(ctx: Context): CoreOptions {
  return {
    region: ctx.require(RegionKey),
    endpointUrl: ctx.value(EndpointKey),
  };
}

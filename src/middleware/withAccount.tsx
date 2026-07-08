import { AccountKey, RegionKey } from "../handlers/keys";
import type { Core } from "../handlers/types";
import { type Middleware } from "../router";

/** Resolves the AWS account ID via STS and pins it on {@link AccountKey}. Does not fail if unavailable. */
export function withAccount(core: Core): Middleware {
  return (h) => ({
    name: () => h.name(),
    description: () => h.description(),
    flags: () => h.flags(),
    arguments: () => h.arguments(),
    children: () => h.children(),
    handle: async (ctx, flags, args) => {
      let account: string | undefined;
      try {
        const region = ctx.require(RegionKey);
        const identity = await core.sts.getCallerIdentity(region);
        account = identity.account;
      } catch {
        // Best effort — credentials may not be configured.
      }
      const next = account ? ctx.withValue(AccountKey, account) : ctx;
      await h.handle(next, flags, args);
    },
  });
}

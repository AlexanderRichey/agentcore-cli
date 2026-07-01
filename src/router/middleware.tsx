import type { Handler } from "./handler";

export type Middleware = (handler: Handler) => Handler;

// A node carries its own middleware when it can contribute to its subtree.
// Routers implement this; plain leaf handlers don't need to.
export interface MiddlewareProvider {
  middlewares(): Middleware[];
}

export function isMiddlewareProvider(h: Handler): h is Handler & MiddlewareProvider {
  return typeof (h as Partial<MiddlewareProvider>).middlewares === "function";
}

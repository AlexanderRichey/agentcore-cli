import { createHandler, type Middleware } from "../router"

// logging is a sample middleware: it wraps a node and prints when (and only
// when) that node is executed as a leaf.
export function withLogging(label: string): Middleware {
  return (h) => ({
    name: () => h.name(),
    description: () => h.description(),
    flags: () => h.flags(),
    children: () => h.children(),
    handle: async (ctx, args) => {
      console.log(`[${label}]`)
      await h.handle(ctx, args)
    },
  })
}

export function withRegion(): Middleware {
  return (h) => createHandler({
    name: h.name(),
    description: h.description(),
    children: h.children(),
    handle: async (ctx, args) => {
      // TODO: Read context from environment: argument, AWS_REGION, or ~/.aws/config
      const newCtx = ctx.withValue("region", "us-east-1")
      console.log("here")
      await h.handle(newCtx, args)
    }
  })
}

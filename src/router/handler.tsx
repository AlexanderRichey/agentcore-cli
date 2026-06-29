import type { Context } from "./context"

export interface Flag {}

export interface Argument {}

export interface Handler {
  name(): string
  description(): string
  // flags(): Record<string, Flag>
  // arguments(): Record<string, Argument>
  handle(ctx: Context, args: any[]): Promise<void>
  children(): Handler[]
}

type CreateHandlerInput = {
  name: string;
  description: string;
  handle?: (ctx: Context, args: any[]) => Promise<void>
  children?: Handler[]
}

const noOpHandler = async (ctx: Context, args: any[]): Promise<void> => {}

class BaseHandler implements Handler {
  _name: string
  _description: string
  _handle: (ctx: Context, args: any[]) => Promise<void>
  _children: Handler[]

  constructor(input: CreateHandlerInput) {
    this._name = input.name
    this._description = input.description
    this._handle = input.handle ?? noOpHandler
    this._children = []
  }

  name(): string {
    return this._name
  }

  description(): string {
    return this._description
  }

  async handle(ctx: Context, args: any[]): Promise<void> {
    await this._handle(ctx, args)
  }

  children(): Handler[] {
    return this._children
  }
}

export function createHandler(input: CreateHandlerInput): Handler {
  return new BaseHandler(input)
}

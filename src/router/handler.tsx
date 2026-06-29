import type z from "zod"
import type { Context } from "./context"

export interface Flag {
  name: string
  description: string
  schema: z.ZodType
}

export interface Argument {
  name: string
  description: string
  schema: z.ZodType
}

export interface Handler {
  name(): string
  description(): string
  flags(): Flag[]
  arguments(): Argument[]
  handle(ctx: Context, args: any[]): Promise<void>
  children(): Handler[]
}

type CreateHandlerInput = {
  name: string;
  description: string;
  flags?: Flag[];
  arguments?: Argument[];
  handle?: (ctx: Context, args: any[]) => Promise<void>
  children?: Handler[]
}

const noOpHandler = async (ctx: Context, args: any[]): Promise<void> => {}

class BaseHandler implements Handler {
  _name: string
  _description: string
  _flags: Flag[]
  _arguments: Argument[]
  _handle: (ctx: Context, args: any[]) => Promise<void>
  _children: Handler[]

  constructor(input: CreateHandlerInput) {
    this._name = input.name
    this._description = input.description
    this._flags = input.flags ?? []
    this._arguments = input.arguments ?? []
    this._handle = input.handle ?? noOpHandler
    this._children = []
  }

  name(): string {
    return this._name
  }

  description(): string {
    return this._description
  }

  flags(): Flag[] {
    return this._flags
  }

  arguments(): Argument[] {
    return this._arguments
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

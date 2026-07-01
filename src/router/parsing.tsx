import { type Command, Option, Argument as CommanderArgument } from "commander";
import type z from "zod";
import type { Context } from "./context";
import type { Argument, Flag, GlobalFlag } from "./handler";

// Inspection describes how a zod schema maps onto a Commander option: whether a
// value must be supplied (required), whether it is variadic (an array), whether
// it is a boolean toggle, and any default value.
export interface Inspection {
  required: boolean;
  variadic: boolean;
  boolean: boolean;
  hasDefault: boolean;
  defaultValue: unknown;
}

// zod v4 exposes a `.def` with a `type` discriminant and wrapper-specific fields
// (`innerType` for optional/default/nullable, `element` for array). We read
// those structurally; this narrow `any` view keeps the access localized.
type AnyDef = { def?: { type?: string; innerType?: any; element?: any; defaultValue?: unknown } };

// baseType finds the innermost zod type name, descending through wrappers and
// array elements, so we know how to coerce the raw string(s) from Commander.
export function baseType(schema: z.ZodType): string | undefined {
  let s: AnyDef = schema as unknown as AnyDef;
  for (;;) {
    const t = s.def?.type;
    if (t === "default" || t === "optional" || t === "nullable" || t === "readonly") {
      s = s.def?.innerType;
    } else if (t === "array") {
      s = s.def?.element;
    } else {
      return t;
    }
  }
}

// inspect peels optional/default/nullable/readonly wrappers off a schema to
// determine the option shape and any default.
export function inspect(schema: z.ZodType): Inspection {
  const required = !schema.isOptional();
  let hasDefault = false;
  let defaultValue: unknown = undefined;
  let variadic = false;

  let s: AnyDef = schema as unknown as AnyDef;
  for (;;) {
    const t = s.def?.type;
    if (t === "default") {
      hasDefault = true;
      defaultValue = s.def?.defaultValue;
      s = s.def?.innerType;
    } else if (t === "optional" || t === "nullable" || t === "readonly") {
      s = s.def?.innerType;
    } else if (t === "array") {
      variadic = true;
      break;
    } else {
      break;
    }
  }

  return { required, variadic, boolean: baseType(schema) === "boolean", hasDefault, defaultValue };
}

// toOption builds a Commander Option from a flag's schema. Booleans become value-less
// toggles; everything else takes a value (`<name>` / variadic `<name...>`). A
// required, non-boolean flag is made mandatory; defaults are forwarded.
export function toOption(flag: Flag): Option {
  const info = inspect(flag.schema);
  const long = `--${flag.name}`;

  let token: string;
  if (info.boolean) {
    token = long;
  } else if (info.variadic) {
    token = `${long} <${flag.name}...>`;
  } else {
    token = `${long} <${flag.name}>`;
  }

  const option = new Option(token, flag.description);
  if (info.hasDefault) {
    option.default(info.defaultValue);
  } else if (info.boolean) {
    option.default(false);
  }
  if (info.required && !info.boolean) {
    option.makeOptionMandatory(true);
  }
  return option;
}

export function toCommanderArgument(arg: Argument): CommanderArgument {
  const info = inspect(arg.schema);
  // Commander treats <> as required and [] as optional: https://github.com/tj/commander.js#more-configuration-1
  // Variadic arguments use trailing ... syntax: https://github.com/tj/commander.js#command-arguments
  const inner = info.variadic ? `${arg.name}...` : arg.name;
  const name = info.required ? `<${inner}>` : `[${inner}]`;
  const commanderArg = new CommanderArgument(name, arg.description);

  if (info.hasDefault) {
    commanderArg.default(info.defaultValue);
  }

  return commanderArg;
}

// attributeName mirrors how Commander camelCases an option name into the key it
// stores on the parsed options object (e.g. "harness-id" -> "harnessId").
function attributeName(name: string): string {
  return new Option(`--${name}`).attributeName();
}

function coerceScalar(type: string | undefined, raw: string): unknown {
  switch (type) {
    case "number":
      return Number(raw);
    case "bigint":
      try {
        return BigInt(raw);
      } catch {
        return raw; // let zod produce the validation error
      }
    case "boolean": {
      const v = raw.toLowerCase();
      if (v === "true" || v === "1" || v === "yes") return true;
      if (v === "false" || v === "0" || v === "no") return false;
      return raw;
    }
    case "date":
      return new Date(raw);
    default:
      return raw;
  }
}

// coerce converts the raw Commander value (a string, string[] for variadic
// options, or a boolean for toggles) into the type the schema expects.
export function coerce(schema: z.ZodType, raw: unknown): unknown {
  if (raw === undefined) return raw; // defer to schema default / optionality
  if (typeof raw === "boolean") return raw; // boolean toggles are already parsed
  const type = baseType(schema);
  if (Array.isArray(raw)) {
    return raw.map((r) => coerceScalar(type, String(r)));
  }
  return coerceScalar(type, String(raw));
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

// validate coerces and validates a single flag's raw value (read from Commander's
// parsed options) against its schema. On failure it reports via Commander's
// `command.error`, which prints a message and exits (or, with exitOverride,
// throws) — so this returns only on success.
function validateFlag(flag: Flag, opts: Record<string, unknown>, command: Command): unknown {
  const result = flag.schema.safeParse(coerce(flag.schema, opts[attributeName(flag.name)]));
  if (!result.success) {
    command.error(`Invalid value for option '--${flag.name}': ${formatZodError(result.error)}`);
  }
  return result.data;
}

// parseFlags validates a leaf's own flags into a typed-by-name object handed to
// the handler.
export function parseFlags(
  flags: Flag[],
  opts: Record<string, unknown>,
  command: Command,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const flag of flags) {
    out[flag.name] = validateFlag(flag, opts, command);
  }
  return out;
}

// applyGlobalFlags validates each inherited group-level flag and stores it on the
// context under its own key (a GlobalFlag is its own ContextKey), returning the
// extended context. Descendants read these via `ctx.value(theGlobalFlag)`.
export function applyGlobalFlags(
  globalFlags: GlobalFlag[],
  opts: Record<string, unknown>,
  command: Command,
  ctx: Context,
): Context {
  let next = ctx;
  for (const globalFlag of globalFlags) {
    next = next.withValue(globalFlag, validateFlag(globalFlag, opts, command));
  }
  return next;
}

function validateArgument(
  argument: Argument,
  input: unknown | undefined,
  command: Command,
): unknown {
  const result = argument.schema.safeParse(coerce(argument.schema, input));
  if (!result.success) {
    command.error(`Invalid value for argument '${argument.name}': ${formatZodError(result.error)}`);
  }
  return result.data;
}

export function parseArguments(
  expectedArguments: Argument[],
  command: Command,
): Record<string, unknown> {
  const inputArguments = command.processedArgs;
  const out: Record<string, unknown> = {};

  for (let index = 0; index < expectedArguments.length; index++) {
    const currentArg = inputArguments[index];
    // should never be undefined based on loop bound
    const expectedArg = expectedArguments[index]!;

    out[expectedArg.name] = validateArgument(expectedArg, currentArg, command);
  }

  return out;
}

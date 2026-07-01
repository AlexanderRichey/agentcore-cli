import type z from "zod";

// Inspection describes how a zod schema maps onto a Commander option: whether a
// value must be supplied (required), whether it is variadic (an array), whether
// it is a boolean toggle, and any default value.
interface Inspection {
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
function baseType(schema: z.ZodType): string | undefined {
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

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

import { test, expect, describe } from "bun:test";
import { Command } from "commander";
import z from "zod";

import { parseFlags, parseArguments, toOption, toCommanderArgument } from "./inputs";
import { flag, argument } from "./handler";

// makeCommand returns a Command with exitOverride so validation failures throw
// instead of calling process.exit, and suppresses output.
function makeCommand(): Command {
  const cmd = new Command("test");
  cmd.exitOverride();
  cmd.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  return cmd;
}

describe("toOption", () => {
  test("required string flag produces mandatory option with value", () => {
    const f = flag("name", "a name", z.string());
    const opt = toOption(f);

    expect(opt.long).toBe("--name");
    expect(opt.mandatory).toBe(true);
    expect(opt.flags).toBe("--name <name>");
  });

  test("optional string flag is not mandatory", () => {
    const f = flag("name", "a name", z.string().optional());
    const opt = toOption(f);

    expect(opt.mandatory).toBe(false);
    expect(opt.flags).toBe("--name <name>");
  });

  test("boolean flag has no value token and defaults to false", () => {
    const f = flag("verbose", "verbose output", z.boolean());
    const opt = toOption(f);

    expect(opt.flags).toBe("--verbose");
    expect(opt.defaultValue).toBe(false);
    expect(opt.mandatory).toBe(false);
  });

  test("flag with schema default is optional and forwards the default", () => {
    const f = flag("count", "n", z.number().default(5));
    const opt = toOption(f);

    expect(opt.defaultValue).toBe(5);
    expect(opt.mandatory).toBe(false);
  });

  test("array schema produces a variadic option", () => {
    const f = flag("tags", "tags", z.array(z.string()));
    const opt = toOption(f);

    expect(opt.variadic).toBe(true);
  });
});

describe("toCommanderArgument", () => {
  test("required argument is marked required", () => {
    const a = argument("id", "the id", z.string());
    const arg = toCommanderArgument(a);

    expect(arg.required).toBe(true);
  });

  test("optional argument is not required", () => {
    const a = argument("id", "the id", z.string().optional());
    const arg = toCommanderArgument(a);

    expect(arg.required).toBe(false);
  });

  test("argument with default applies it", () => {
    const a = argument("region", "AWS region", z.string().default("us-east-1"));
    const arg = toCommanderArgument(a);

    expect(arg.defaultValue).toBe("us-east-1");
  });
});

describe("parseFlags", () => {
  test("coerces raw values and keys output by flag name", () => {
    const flags = [
      flag("id", "the id", z.string()),
      flag("count", "n", z.number()),
      flag("bool", "a bool", z.boolean()),
    ];
    const cmd = makeCommand();
    const opts = { id: "abc", count: "3", bool: "true" };

    const result = parseFlags(flags, opts, cmd);

    expect(result).toEqual({ id: "abc", count: 3, bool: true });
  });

  test("applies schema defaults for omitted flags", () => {
    const flags = [flag("region", "r", z.string().default("us-east-1"))];
    const cmd = makeCommand();

    const result = parseFlags(flags, {}, cmd);

    expect(result).toEqual({ region: "us-east-1" });
  });

  test("optional flag resolves to undefined when omitted", () => {
    const flags = [flag("tag", "t", z.string().optional())];
    const cmd = makeCommand();

    const result = parseFlags(flags, {}, cmd);

    expect(result).toEqual({ tag: undefined });
  });

  test("rejects values that fail schema validation", () => {
    const flags = [flag("id", "the id", z.string().max(3))];
    const cmd = makeCommand();

    expect(() => parseFlags(flags, { id: "toolong" }, cmd)).toThrow();
  });

  test("coerces boolean toggle", () => {
    const flags = [flag("verbose", "v", z.boolean())];
    const cmd = makeCommand();

    const result = parseFlags(flags, { verbose: "true" }, cmd);

    expect(result).toEqual({ verbose: true });
  });

  test("resolves hyphenated flag names from Commander's camelCase keys", () => {
    const flags = [flag("harness-id", "id", z.string())];
    const cmd = makeCommand();
    // Commander stores --harness-id as opts.harnessId
    const opts = { harnessId: "x123" };

    const result = parseFlags(flags, opts, cmd);

    expect(result).toEqual({ "harness-id": "x123" });
  });

  test("coerces variadic flag values from string array", () => {
    const flags = [flag("tags", "t", z.array(z.string()))];
    const cmd = makeCommand();
    const opts = { tags: ["a", "b", "c"] };

    const result = parseFlags(flags, opts, cmd);

    expect(result).toEqual({ tags: ["a", "b", "c"] });
  });

  test("coerces variadic number flag values from string array", () => {
    const flags = [flag("ports", "p", z.array(z.number()))];
    const cmd = makeCommand();
    const opts = { ports: ["80", "443"] };

    const result = parseFlags(flags, opts, cmd);

    expect(result).toEqual({ ports: [80, 443] });
  });
});

describe("parseArguments", () => {
  test("maps positional inputs to argument names in order", () => {
    const args = [
      argument("key", "config key", z.string()),
      argument("value", "config value", z.string()),
    ];
    const cmd = makeCommand();

    const result = parseArguments(args, ["telemetry.enabled", "true"], cmd);

    expect(result).toEqual({ key: "telemetry.enabled", value: "true" });
  });

  test("applies schema default for omitted optional argument", () => {
    const args = [argument("region", "r", z.string().default("us-east-1"))];
    const cmd = makeCommand();

    const result = parseArguments(args, [], cmd);

    expect(result).toEqual({ region: "us-east-1" });
  });

  test("optional argument resolves to undefined when omitted", () => {
    const args = [argument("key", "k", z.string()), argument("value", "v", z.string().optional())];
    const cmd = makeCommand();

    const result = parseArguments(args, ["mykey"], cmd);

    expect(result).toEqual({ key: "mykey", value: undefined });
  });

  test("rejects values that fail schema validation", () => {
    const args = [argument("id", "the id", z.uuid())];
    const cmd = makeCommand();

    expect(() => parseArguments(args, ["not-a-uuid"], cmd)).toThrow();
  });

  test("rejects extra positional inputs beyond expected arguments", () => {
    const args = [argument("key", "k", z.string())];
    const cmd = makeCommand();

    expect(() => parseArguments(args, ["mykey", "unexpected-extra"], cmd)).toThrow();
  });

  test("rejects missing required arguments", () => {
    const args = [argument("key", "k", z.string()), argument("value", "v", z.string())];
    const cmd = makeCommand();

    expect(() => parseArguments(args, ["onlyone"], cmd)).toThrow();
  });

  test("coerces input values based on schema", () => {
    const args = [
      argument("name", "name", z.string()),
      argument("port", "port number", z.number()),
      argument("verbose", "verbose", z.boolean()),
    ];
    const cmd = makeCommand();

    const result = parseArguments(args, ["myapp", "8080", "true"], cmd);

    expect(result).toEqual({ name: "myapp", port: 8080, verbose: true });
  });
});

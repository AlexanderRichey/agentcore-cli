import z from "zod";
import { createHandler, argument } from "../../router";
import type { AppIO } from "../types";

/*
 * read/write global configuration values. ex. telemetry settings, log level, etc.
 * Ex.
 * `config [key] [value]` sets key to value.
 * `config [key]` prints the value with key.
 * `config` prints the full config.
 */
export const createConfigHandler = (io: AppIO) =>
  createHandler({
    name: "config",
    description: "read/write global config values",
    arguments: [
      argument(
        "key",
        "config key in JSON path notation (e.g. telemetry.enabled)",
        z.string().optional(),
      ),
      argument("value", "value to set for the key", z.string().optional()),
    ],
    handle: async (_ctx, _flags, args) => {
      // TODO: implment a real handler that update the global config via injected config accessor.
      io.stdout.write(`updating config key=${args.key}, value=${args.value}\n`);
    },
  });

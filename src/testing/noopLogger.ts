import type { Logger } from "../common";

const noop = () => {};

export const noopLogger: Logger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  child: () => noopLogger,
  flush: async () => {},
};

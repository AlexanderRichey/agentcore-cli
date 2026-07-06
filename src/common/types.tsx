export type LoggerBindings = Record<string, string | number | boolean | null | undefined>;

export type LogArgs = [object, string?] | [string];

type LogFn = (...args: LogArgs) => void;

export type Logger = { [K in "debug" | "info" | "warn" | "error"]: LogFn } & {
  child: (bindings: LoggerBindings) => Logger;
  flush: () => Promise<void>;
};

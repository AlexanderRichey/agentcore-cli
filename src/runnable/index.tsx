// ExitCode provides names for default Unix exit codes.
export enum ExitCode {
  SUCCESS = 0,
  FAILURE = 1
}

// Runnable is intended to be implemented by any application's main entrypoint.
// Implementations should throw errors to fit the JavaScript idiom. Exit codes
// are handled properly when using runRunnable.
export interface Runnable {
  run(argv: string[]): void;
}

// runRunnable creates and runs any instance of Runnable with proper exit code handling.
export function runRunnable(createRunnable: () => Runnable, argv: string[] = process.argv): ExitCode {
  try {
    const runnable = createRunnable()
    runnable.run(argv);
    return ExitCode.SUCCESS
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return ExitCode.FAILURE;
  }
}

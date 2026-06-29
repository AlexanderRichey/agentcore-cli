// ExitCode provides names for default Unix exit codes.
export enum ExitCode {
  SUCCESS = 0,
  FAILURE = 1
}

// Runnable can be implemented by any application's main entrypoint.
export interface Runnable {
  run(argv: string[]): void;
}

// runRunnable creates and runs any instance of Runnable with proper exit code handling.
export function runRunnable(createRunnable: () => Runnable, argv: string[] = process.argv): ExitCode {
  return runWithExitCode(() => {
    createRunnable().run(argv)
  })
}

// runWithExitCode safely runs the given function with exit code handling.
export function runWithExitCode(fn: (argv: string[]) => void, argv: string[] = process.argv): ExitCode {
  try {
    fn(argv)
    return ExitCode.SUCCESS
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return ExitCode.FAILURE;
  }
}

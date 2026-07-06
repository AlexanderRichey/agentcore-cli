/**
 * Polls a function until it returns a truthy value (or passes a condition) or times out.
 */
export async function poll<T>(
  fn: () => T | Promise<T>,
  opts: {
    timeout?: number;
    interval?: number;
    condition?: (result: T) => boolean;
    throwOnError?: boolean;
  } = {},
): Promise<T> {
  const { timeout = 2000, interval = 50, condition, throwOnError: failOnError } = opts;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const result = await fn();
      const passed = condition ? condition(result) : !!result;
      if (passed) return result;
    } catch (error) {
      if (failOnError) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  // TODO: make this a custom error class that carries more information for telemetry.
  throw new Error(`poll timed out after ${timeout}ms`);
}

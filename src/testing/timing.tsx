export function tick(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// waitFor polls `predicate` until it returns true (or the timeout elapses),
// ticking between attempts so pending renders/queries flush. Use it instead of a
// fixed sleep so tests are robust to timing: assert on the outcome, not a delay.
export async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 1000,
): Promise<void> {
  const step = 5;
  let waited = 0;
  while (!(await predicate())) {
    if (waited >= timeoutMs) throw new Error("waitFor: condition not met before timeout");
    await tick(step);
    waited += step;
  }
}

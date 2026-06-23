import { test, expect } from "bun:test";
import { greet } from "../src/index.ts";

test("greet returns the expected greeting", () => {
  expect(greet()).toBe("Hello via Bun!");
});

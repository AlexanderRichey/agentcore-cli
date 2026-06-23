import type { Runnable } from "../runnable"

export class App implements Runnable {
  constructor() {}

  run(argv: string[]): void {
    console.log("Hello world!")
  }
}

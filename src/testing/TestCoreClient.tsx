import type {
  GetHarnessResponse,
  ListHarnessesResponse,
} from "@aws-sdk/client-bedrock-agentcore-control";
import type { Core } from "../handlers/types";
import type { CoreHarnessClient } from "../handlers/harness/types";
import type { CoreOptions } from "../core/types";

// TestCoreClient is a hand-controllable `Core` for tests. It implements the same
// interface the real CoreClient satisfies, so it drops straight into
// `createRootHandler(core)` and into a screen's `ScreenProps.core`. Unlike the
// fixture-backed real CoreClient (which exercises src/core end to end), this fake
// is for tests that need to *drive* Core directly: force an error, return a
// specific canned response, or assert on the exact arguments a handler/screen
// passed in.
//
// Configure it per test:
//
//   const core = new TestCoreClient();
//   core.harness.setListResponse({ harnesses: [...] });
//   core.harness.setError(new Error("boom"));           // make the next calls throw
//   core.harness.calls;                                 // inspect recorded calls

// A single recorded call: the method invoked and the arguments it received.
export interface RecordedCall {
  method: string;
  args: unknown[];
}

const DEFAULT_LIST_RESPONSE: ListHarnessesResponse = { harnesses: [] };
const DEFAULT_GET_RESPONSE: GetHarnessResponse = {} as GetHarnessResponse;

// TestHarnessClient is the harness sub-client of TestCoreClient.
export class TestHarnessClient implements CoreHarnessClient {
  // calls records every invocation in order, for assertions.
  readonly calls: RecordedCall[] = [];

  private listResponse: ListHarnessesResponse = DEFAULT_LIST_RESPONSE;
  private getResponse: GetHarnessResponse = DEFAULT_GET_RESPONSE;
  private error?: Error;

  // setListResponse sets what listHarnesses resolves to (when not erroring).
  setListResponse(response: ListHarnessesResponse): this {
    this.listResponse = response;
    return this;
  }

  // setGetResponse sets what getHarness resolves to (when not erroring).
  setGetResponse(response: GetHarnessResponse): this {
    this.getResponse = response;
    return this;
  }

  // setError makes every subsequent call reject with `error`. Pass undefined to
  // clear it.
  setError(error: Error | undefined): this {
    this.error = error;
    return this;
  }

  async getHarness(id: string, options: CoreOptions): Promise<GetHarnessResponse> {
    this.calls.push({ method: "getHarness", args: [id, options] });
    if (this.error) throw this.error;
    return this.getResponse;
  }

  async listHarnesses(
    nextToken: string | undefined,
    maxResults: number | undefined,
    options: CoreOptions,
  ): Promise<ListHarnessesResponse> {
    this.calls.push({ method: "listHarnesses", args: [nextToken, maxResults, options] });
    if (this.error) throw this.error;
    return this.listResponse;
  }
}

// TestCoreClient implements the Core contract with fully controllable sub-clients.
export class TestCoreClient implements Core {
  readonly harness = new TestHarnessClient();
}

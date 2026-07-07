import type {
  GetHarnessResponse,
  GetHarnessEndpointResponse,
  ListHarnessesResponse,
  ListHarnessEndpointsResponse,
  ListHarnessVersionsResponse,
} from "@aws-sdk/client-bedrock-agentcore-control";
import type {
  InvokeAgentRuntimeCommandRequest,
  InvokeAgentRuntimeCommandResponse,
  InvokeAgentRuntimeCommandStreamOutput,
  InvokeHarnessRequest,
  InvokeHarnessResponse,
  InvokeHarnessStreamOutput,
} from "@aws-sdk/client-bedrock-agentcore";
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
const DEFAULT_GET_VERSION_RESPONSE: GetHarnessResponse = {} as GetHarnessResponse;
const DEFAULT_LIST_ENDPOINTS_RESPONSE: ListHarnessEndpointsResponse = { endpoints: [] };
const DEFAULT_LIST_VERSIONS_RESPONSE: ListHarnessVersionsResponse = { harnessVersions: [] };
const DEFAULT_GET_ENDPOINT_RESPONSE: GetHarnessEndpointResponse = {} as GetHarnessEndpointResponse;

// abortError mirrors the error the SDK's abort handling rejects with.
function abortError(): Error {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

// abortable wraps a stream so iteration rejects with an AbortError as soon as
// `signal` aborts, mirroring how the SDK cuts an event stream off mid-read.
// Each next() races against the abortion; the pre-attached catch swallows the
// rejection when nothing is racing (e.g. abort after the stream already ended)
// so tests don't fail on unhandled-rejection noise.
async function* abortable<T>(source: AsyncIterable<T>, signal?: AbortSignal): AsyncGenerator<T> {
  if (!signal) {
    yield* source;
    return;
  }
  const aborted = new Promise<never>((_, reject) => {
    if (signal.aborted) reject(abortError());
    else signal.addEventListener("abort", () => reject(abortError()), { once: true });
  });
  aborted.catch(() => {});

  const iterator = source[Symbol.asyncIterator]();
  for (;;) {
    const result = await Promise.race([iterator.next(), aborted]);
    if (result.done) return;
    yield result.value;
  }
}

// events wraps canned events as a one-shot AsyncIterable.
async function* events<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) yield item;
}

// TestHarnessClient is the harness sub-client of TestCoreClient.
export class TestHarnessClient implements CoreHarnessClient {
  // calls records every invocation in order, for assertions.
  readonly calls: RecordedCall[] = [];

  private listResponse: ListHarnessesResponse = DEFAULT_LIST_RESPONSE;
  private getResponse: GetHarnessResponse = DEFAULT_GET_RESPONSE;
  private getVersionResponse: GetHarnessResponse = DEFAULT_GET_VERSION_RESPONSE;
  private getEndpointResponse: GetHarnessEndpointResponse = DEFAULT_GET_ENDPOINT_RESPONSE;
  private listEndpointsResponse: ListHarnessEndpointsResponse = DEFAULT_LIST_ENDPOINTS_RESPONSE;
  private listVersionsResponse: ListHarnessVersionsResponse = DEFAULT_LIST_VERSIONS_RESPONSE;
  private invokeEvents: InvokeHarnessStreamOutput[] = [];
  private invokeStreams: AsyncIterable<InvokeHarnessStreamOutput>[] = [];
  private execEvents: InvokeAgentRuntimeCommandStreamOutput[] = [];
  private execStreams: AsyncIterable<InvokeAgentRuntimeCommandStreamOutput>[] = [];
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

  // setGetVersionResponse sets what getHarnessVersion resolves to (when not
  // erroring).
  setGetVersionResponse(response: GetHarnessResponse): this {
    this.getVersionResponse = response;
    return this;
  }

  // setGetEndpointResponse sets what getHarnessEndpoint resolves to (when not
  // erroring).
  setGetEndpointResponse(response: GetHarnessEndpointResponse): this {
    this.getEndpointResponse = response;
    return this;
  }

  // setListEndpointsResponse sets what listHarnessEndpoints resolves to (when
  // not erroring).
  setListEndpointsResponse(response: ListHarnessEndpointsResponse): this {
    this.listEndpointsResponse = response;
    return this;
  }

  // setListVersionsResponse sets what listHarnessVersions resolves to (when not
  // erroring).
  setListVersionsResponse(response: ListHarnessVersionsResponse): this {
    this.listVersionsResponse = response;
    return this;
  }

  // setInvokeEvents sets the canned full turn every invokeHarness call streams
  // (unless a queued stream takes precedence).
  setInvokeEvents(...events: InvokeHarnessStreamOutput[]): this {
    this.invokeEvents = events;
    return this;
  }

  // queueInvokeStream enqueues a stream for a single invokeHarness call; calls
  // consume the queue in FIFO order before falling back to the canned events.
  // Pass a StreamController to hold the stream open and pump it by hand.
  queueInvokeStream(stream: AsyncIterable<InvokeHarnessStreamOutput>): this {
    this.invokeStreams.push(stream);
    return this;
  }

  // setExecEvents sets the canned stream every invokeAgentRuntimeCommand call
  // yields (unless a queued stream takes precedence).
  setExecEvents(...events: InvokeAgentRuntimeCommandStreamOutput[]): this {
    this.execEvents = events;
    return this;
  }

  // queueExecStream enqueues a stream for a single invokeAgentRuntimeCommand
  // call, FIFO before the canned events — same contract as queueInvokeStream.
  queueExecStream(stream: AsyncIterable<InvokeAgentRuntimeCommandStreamOutput>): this {
    this.execStreams.push(stream);
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

  async getHarnessVersion(
    id: string,
    version: string,
    options: CoreOptions,
  ): Promise<GetHarnessResponse> {
    this.calls.push({ method: "getHarnessVersion", args: [id, version, options] });
    if (this.error) throw this.error;
    return this.getVersionResponse;
  }

  async getHarnessEndpoint(
    id: string,
    qualifier: string,
    options: CoreOptions,
  ): Promise<GetHarnessEndpointResponse> {
    this.calls.push({ method: "getHarnessEndpoint", args: [id, qualifier, options] });
    if (this.error) throw this.error;
    return this.getEndpointResponse;
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

  async listHarnessEndpoints(
    id: string,
    nextToken: string | undefined,
    maxResults: number | undefined,
    options: CoreOptions,
  ): Promise<ListHarnessEndpointsResponse> {
    this.calls.push({
      method: "listHarnessEndpoints",
      args: [id, nextToken, maxResults, options],
    });
    if (this.error) throw this.error;
    return this.listEndpointsResponse;
  }

  async listHarnessVersions(
    id: string,
    nextToken: string | undefined,
    maxResults: number | undefined,
    options: CoreOptions,
  ): Promise<ListHarnessVersionsResponse> {
    this.calls.push({
      method: "listHarnessVersions",
      args: [id, nextToken, maxResults, options],
    });
    if (this.error) throw this.error;
    return this.listVersionsResponse;
  }

  async invokeHarness(
    request: InvokeHarnessRequest,
    options: CoreOptions,
    abortSignal?: AbortSignal,
  ): Promise<InvokeHarnessResponse> {
    this.calls.push({ method: "invokeHarness", args: [request, options, abortSignal] });
    if (this.error) throw this.error;
    const stream = this.invokeStreams.shift() ?? events(this.invokeEvents);
    return { stream: abortable(stream, abortSignal) };
  }

  async invokeAgentRuntimeCommand(
    request: InvokeAgentRuntimeCommandRequest,
    options: CoreOptions,
    abortSignal?: AbortSignal,
  ): Promise<InvokeAgentRuntimeCommandResponse> {
    this.calls.push({
      method: "invokeAgentRuntimeCommand",
      args: [request, options, abortSignal],
    });
    if (this.error) throw this.error;
    const stream = this.execStreams.shift() ?? events(this.execEvents);
    return {
      contentType: "application/json",
      statusCode: 200,
      runtimeSessionId: request.runtimeSessionId,
      stream: abortable(stream, abortSignal),
    };
  }
}

// TestCoreClient implements the Core contract with fully controllable sub-clients.
export class TestCoreClient implements Core {
  readonly harness = new TestHarnessClient();
}

import {
  GetHarnessCommand,
  GetHarnessEndpointCommand,
  ListHarnessesCommand,
  ListHarnessEndpointsCommand,
  ListHarnessVersionsCommand,
  type GetHarnessResponse,
  type GetHarnessEndpointResponse,
  type ListHarnessesResponse,
  type ListHarnessEndpointsResponse,
  type ListHarnessVersionsResponse,
} from "@aws-sdk/client-bedrock-agentcore-control";
import {
  InvokeAgentRuntimeCommandCommand,
  InvokeHarnessCommand,
  type InvokeAgentRuntimeCommandRequest,
  type InvokeAgentRuntimeCommandResponse,
  type InvokeHarnessRequest,
  type InvokeHarnessResponse,
} from "@aws-sdk/client-bedrock-agentcore";
import type { CoreHarnessClient } from "../handlers/harness/types";
import type { AwsClients, CoreOptions } from "./types";
import { toClientConfig } from "./utils";

// HarnessClient implements the harness-facing operations on top of the shared AWS
// clients provided by CoreClient. It owns no clients of its own; it borrows the
// cached ones so every Core sub-client shares the same connections.
export class HarnessClient implements CoreHarnessClient {
  constructor(private readonly clients: AwsClients) {}

  async getHarness(id: string, options: CoreOptions): Promise<GetHarnessResponse> {
    return this.clients
      .control(toClientConfig(options))
      .send(new GetHarnessCommand({ harnessId: id }));
  }

  async getHarnessVersion(
    id: string,
    version: string,
    options: CoreOptions,
  ): Promise<GetHarnessResponse> {
    return this.clients
      .control(toClientConfig(options))
      .send(new GetHarnessCommand({ harnessId: id, harnessVersion: version }));
  }

  async getHarnessEndpoint(
    id: string,
    qualifier: string,
    options: CoreOptions,
  ): Promise<GetHarnessEndpointResponse> {
    return this.clients
      .control(toClientConfig(options))
      .send(new GetHarnessEndpointCommand({ harnessId: id, endpointName: qualifier }));
  }

  async listHarnesses(
    nextToken: string | undefined,
    maxResults: number | undefined,
    options: CoreOptions,
  ): Promise<ListHarnessesResponse> {
    return this.clients
      .control(toClientConfig(options))
      .send(new ListHarnessesCommand({ nextToken, maxResults }));
  }

  async listHarnessEndpoints(
    id: string,
    nextToken: string | undefined,
    maxResults: number | undefined,
    options: CoreOptions,
  ): Promise<ListHarnessEndpointsResponse> {
    return this.clients
      .control(toClientConfig(options))
      .send(new ListHarnessEndpointsCommand({ harnessId: id, nextToken, maxResults }));
  }

  async listHarnessVersions(
    id: string,
    nextToken: string | undefined,
    maxResults: number | undefined,
    options: CoreOptions,
  ): Promise<ListHarnessVersionsResponse> {
    return this.clients
      .control(toClientConfig(options))
      .send(new ListHarnessVersionsCommand({ harnessId: id, nextToken, maxResults }));
  }

  async invokeHarness(
    request: InvokeHarnessRequest,
    options: CoreOptions,
    abortSignal?: AbortSignal,
  ): Promise<InvokeHarnessResponse> {
    const response = await this.clients
      .data(toClientConfig(options))
      .send(new InvokeHarnessCommand(request), { abortSignal });
    if (!response.stream || !abortSignal) return response;
    // The SDK honors the abort signal while the request is being established,
    // but once the event stream is flowing, aborting no longer tears the
    // iteration down — consumers awaiting the next event would hang until the
    // turn ran to completion. Racing each read against the signal keeps abort
    // (esc in the TUI) responsive mid-stream.
    return { ...response, stream: abortable(response.stream, abortSignal) };
  }

  async invokeAgentRuntimeCommand(
    request: InvokeAgentRuntimeCommandRequest,
    options: CoreOptions,
    abortSignal?: AbortSignal,
  ): Promise<InvokeAgentRuntimeCommandResponse> {
    const response = await this.clients
      .data(toClientConfig(options))
      .send(new InvokeAgentRuntimeCommandCommand(request), { abortSignal });
    if (!response.stream || !abortSignal) return response;
    // Same mid-stream abort gap as invokeHarness; see above.
    return { ...response, stream: abortable(response.stream, abortSignal) };
  }
}

// abortError mirrors the error the SDK rejects with on a pre-stream abort, so
// consumers see one shape either way.
function abortError(): Error {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

// abortable relays `source`, rejecting the pending read as soon as `signal`
// aborts. The pre-attached catch swallows the rejection when no read is in
// flight (e.g. abort after the stream ended) to avoid unhandled-rejection
// noise.
async function* abortable<T>(source: AsyncIterable<T>, signal: AbortSignal): AsyncGenerator<T> {
  const aborted = new Promise<never>((_, reject) => {
    if (signal.aborted) reject(abortError());
    else signal.addEventListener("abort", () => reject(abortError()), { once: true });
  });
  aborted.catch(() => {});

  const iterator = source[Symbol.asyncIterator]();
  try {
    for (;;) {
      const result = await Promise.race([iterator.next(), aborted]);
      if (result.done) return;
      yield result.value;
    }
  } finally {
    // Close the SDK stream on early exit to release the connection. Fire and
    // forget: its settlement may itself wait on the wedged stream.
    void iterator.return?.()?.catch(() => {});
  }
}

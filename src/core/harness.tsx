import {
  GetHarnessCommand,
  ListHarnessesCommand,
  type GetHarnessResponse,
  type ListHarnessesResponse,
} from "@aws-sdk/client-bedrock-agentcore-control";
import type { CoreHarnessClient } from "../handlers/harness/types";
import type { AwsClients, ClientConfig, CoreOptions } from "./types";

// toClientConfig translates the caller-facing CoreOptions into the ClientConfig the
// SDK client factories expect. `endpoint` is only set when an override is provided
// so the SDK falls back to its default endpoint resolution otherwise.
function toClientConfig(options: CoreOptions): ClientConfig {
  return {
    region: options.region,
    ...(options.endpointUrl ? { endpoint: options.endpointUrl } : {}),
  };
}

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

  async listHarnesses(
    nextToken: string | undefined,
    options: CoreOptions,
  ): Promise<ListHarnessesResponse> {
    return this.clients
      .control(toClientConfig(options))
      .send(new ListHarnessesCommand({ nextToken }));
  }
}

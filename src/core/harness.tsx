import {
  GetHarnessCommand,
  ListHarnessesCommand,
  type GetHarnessResponse,
  type ListHarnessesResponse,
} from "@aws-sdk/client-bedrock-agentcore-control";
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

  async listHarnesses(
    nextToken: string | undefined,
    maxResults: number | undefined,
    options: CoreOptions,
  ): Promise<ListHarnessesResponse> {
    return this.clients
      .control(toClientConfig(options))
      .send(new ListHarnessesCommand({ nextToken, maxResults }));
  }
}

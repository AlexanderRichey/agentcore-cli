import type {
  GetHarnessResponse,
  ListHarnessesResponse,
} from "@aws-sdk/client-bedrock-agentcore-control";
import type {
  InvokeHarnessRequest,
  InvokeHarnessResponse,
} from "@aws-sdk/client-bedrock-agentcore";
import type { CoreOptions } from "../../core/types";

export interface CoreHarnessClient {
  getHarness(id: string, options: CoreOptions): Promise<GetHarnessResponse>;
  listHarnesses(
    nextToken: string | undefined,
    maxResults: number | undefined,
    options: CoreOptions,
  ): Promise<ListHarnessesResponse>;
  invokeHarness(
    request: InvokeHarnessRequest,
    options: CoreOptions,
    abortSignal?: AbortSignal,
  ): Promise<InvokeHarnessResponse>;
}

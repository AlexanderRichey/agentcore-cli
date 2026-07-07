import type {
  GetHarnessResponse,
  GetHarnessEndpointResponse,
  ListHarnessesResponse,
  ListHarnessEndpointsResponse,
} from "@aws-sdk/client-bedrock-agentcore-control";
import type {
  InvokeHarnessRequest,
  InvokeHarnessResponse,
} from "@aws-sdk/client-bedrock-agentcore";
import type { CoreOptions } from "../../core/types";

export interface CoreHarnessClient {
  getHarness(id: string, options: CoreOptions): Promise<GetHarnessResponse>;
  getHarnessEndpoint(
    id: string,
    qualifier: string,
    options: CoreOptions,
  ): Promise<GetHarnessEndpointResponse>;
  listHarnesses(
    nextToken: string | undefined,
    maxResults: number | undefined,
    options: CoreOptions,
  ): Promise<ListHarnessesResponse>;
  listHarnessEndpoints(
    id: string,
    nextToken: string | undefined,
    maxResults: number | undefined,
    options: CoreOptions,
  ): Promise<ListHarnessEndpointsResponse>;
  invokeHarness(
    request: InvokeHarnessRequest,
    options: CoreOptions,
    abortSignal?: AbortSignal,
  ): Promise<InvokeHarnessResponse>;
}

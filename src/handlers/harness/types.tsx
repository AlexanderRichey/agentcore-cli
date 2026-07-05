import type {
  GetHarnessResponse,
  ListHarnessesResponse,
} from "@aws-sdk/client-bedrock-agentcore-control";
import type { CoreOptions } from "../../core/types";

export interface CoreHarnessClient {
  getHarness(id: string, options: CoreOptions): Promise<GetHarnessResponse>;
  listHarnesses(
    nextToken: string | undefined,
    options: CoreOptions,
  ): Promise<ListHarnessesResponse>;
}

import { BedrockAgentCoreControlClient } from "@aws-sdk/client-bedrock-agentcore-control";
import { BedrockAgentCoreClient } from "@aws-sdk/client-bedrock-agentcore";
import type { CreateControlClient, CreateDataClient } from "./types";

// createControlClient / createDataClient are the production factories injected
// into CoreClient at the app edge (src/index.ts). They live here — rather than
// inline in index.ts — so tests (the record/replay fixture layer) can reuse the
// exact same construction when talking to the live APIs in record mode.

export const createControlClient: CreateControlClient = (config) =>
  new BedrockAgentCoreControlClient({ ...config });

export const createDataClient: CreateDataClient = (config) =>
  new BedrockAgentCoreClient({ ...config });

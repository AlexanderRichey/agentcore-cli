import type { CoreHarnessClient } from "../handlers/harness/types";

export class HarnessClient implements CoreHarnessClient {
  getHarness(region: string, id: string): any {
    return {
      harness: {
        harnessId: "FunTimes-T2MFxkuezh",
        harnessName: "FunTimes",
        arn: "arn:aws:bedrock-agentcore:us-east-1:501930284170:harness/FunTimes-T2MFxkuezh",
        status: "READY",
        executionRoleArn: "arn:aws:iam::501930284170:role/JustForFun_FunTimes",
        createdAt: "2026-05-01T18:48:30.822039+00:00",
        updatedAt: "2026-05-15T20:33:10.968674+00:00",
        model: {
          bedrockModelConfig: {
            modelId: "global.anthropic.claude-sonnet-4-6",
            apiFormat: "converse_stream",
          },
        },
        systemPrompt: [
          {
            text: "You are a helpful assistant",
          },
        ],
        tools: [],
        skills: [],
        allowedTools: ["*"],
        truncation: {
          strategy: "sliding_window",
          config: {
            slidingWindow: {
              messagesCount: 150,
            },
          },
        },
        environment: {
          agentCoreRuntimeEnvironment: {
            agentRuntimeArn:
              "arn:aws:bedrock-agentcore:us-east-1:501930284170:runtime/harness_FunTimes-CxH6rgBeIE",
            agentRuntimeName: "harness_FunTimes",
            agentRuntimeId: "harness_FunTimes-CxH6rgBeIE",
            lifecycleConfiguration: {
              idleRuntimeSessionTimeout: 900,
              maxLifetime: 28800,
            },
            networkConfiguration: {
              networkMode: "PUBLIC",
            },
            filesystemConfigurations: [],
          },
        },
        environmentArtifact: {
          containerConfiguration: {
            containerUri: "public.ecr.aws/docker/library/node:22",
          },
        },
        environmentVariables: {},
        maxIterations: 75,
        timeoutSeconds: 3600,
      },
    };
  }

  listHarnesses(region: string, nextToken?: string): any {
    return [
      {
        harnessId: "FunTimes-T2MFxkuezh",
        harnessName: "FunTimes",
        arn: "arn:aws:bedrock-agentcore:us-east-1:501930284170:harness/FunTimes-T2MFxkuezh",
        status: "READY",
        createdAt: "2026-05-01T18:48:30.822039+00:00",
        updatedAt: "2026-05-15T20:33:10.968674+00:00",
      },
      {
        harnessId: "MyAgentCoreProject_CliHarness-mmIoYJABYC",
        harnessName: "MyAgentCoreProject_CliHarness",
        arn: "arn:aws:bedrock-agentcore:us-east-1:501930284170:harness/MyAgentCoreProject_CliHarness-mmIoYJABYC",
        status: "READY",
        createdAt: "2026-05-04T15:27:11.514984+00:00",
        updatedAt: "2026-05-04T15:27:22.489967+00:00",
      },
    ];
  }
}

import { test, expect } from "bun:test";
import type { BedrockAgentCoreControlClient } from "@aws-sdk/client-bedrock-agentcore-control";
import type { BedrockAgentCoreClient } from "@aws-sdk/client-bedrock-agentcore";
import { CoreClient } from "./index";
import type { ClientConfig } from "./types";
import { toClientConfig } from "./utils";

// A minimal stand-in for the SDK clients; CoreClient only stores and returns
// them, so an opaque tagged object is enough to assert identity/caching.
function fakeControl(config: ClientConfig): BedrockAgentCoreControlClient {
  return { config, kind: "control" } as unknown as BedrockAgentCoreControlClient;
}
function fakeData(config: ClientConfig): BedrockAgentCoreClient {
  return { config, kind: "data" } as unknown as BedrockAgentCoreClient;
}

test("control() constructs a client once per config and caches it", () => {
  let built = 0;
  const core = new CoreClient((config) => {
    built++;
    return fakeControl(config);
  }, fakeData);

  const a = core.control({ region: "us-east-1" });
  const b = core.control({ region: "us-east-1" });

  expect(a).toBe(b);
  expect(built).toBe(1);
});

test("control() builds a distinct client per distinct config", () => {
  let built = 0;
  const core = new CoreClient((config) => {
    built++;
    return fakeControl(config);
  }, fakeData);

  core.control({ region: "us-east-1" });
  core.control({ region: "us-west-2" });
  core.control({ region: "us-east-1", endpoint: "https://example" });

  expect(built).toBe(3);
});

test("data() caches independently of control()", () => {
  let controlBuilt = 0;
  let dataBuilt = 0;
  const core = new CoreClient(
    (config) => {
      controlBuilt++;
      return fakeControl(config);
    },
    (config) => {
      dataBuilt++;
      return fakeData(config);
    },
  );

  core.control({ region: "us-east-1" });
  const d1 = core.data({ region: "us-east-1" });
  const d2 = core.data({ region: "us-east-1" });

  expect(d1).toBe(d2);
  expect(controlBuilt).toBe(1);
  expect(dataBuilt).toBe(1);
});

test("exposes a harness sub-client", () => {
  const core = new CoreClient(fakeControl, fakeData);
  expect(core.harness).toBeDefined();
});

test("toClientConfig maps region and omits endpoint when not overridden", () => {
  expect(toClientConfig({ region: "us-east-1" })).toEqual({ region: "us-east-1" });
});

test("toClientConfig sets endpoint only when an override is provided", () => {
  expect(toClientConfig({ region: "us-east-1", endpointUrl: "https://custom" })).toEqual({
    region: "us-east-1",
    endpoint: "https://custom",
  });
});

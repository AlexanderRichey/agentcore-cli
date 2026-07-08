import { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useNavigate } from "react-router";
import type {
  Harness,
  HarnessMemoryConfiguration,
  HarnessTool,
  UpdateHarnessRequest,
} from "@aws-sdk/client-bedrock-agentcore-control";
import type { CreateHarnessInput } from "../handlers/harness/types";
import type { ScreenProps } from "../handlers/types";
import { coreOptsFromCtx } from "../handlers/utils";
import { Layout } from "./Layout";
import { FormTextInput } from "./FormTextInput";
import { FormRadioGroup, type FormRadioOption } from "./FormRadioGroup";
import { Stepper, type Step } from "./ui/stepper";
import { TextInput } from "./ui/text-input";
import { Spinner } from "./ui/spinner";
import { CodeBlock } from "./ui/code-block";
import { ScrollView } from "ink-scroll-view";
import { darkTheme } from "./ui/_core.js";
import { Divider } from "./ui/divider/Divider.js";

const theme = darkTheme;

// ─── form model ───────────────────────────────────────────────────────────────

export type MemoryKind = "managed" | "byo" | "disabled";

// ModelKind selects the provider member of the API's HarnessModelConfiguration
// union; "default" means "don't send a model" (service default on create, keep
// the current one on update).
export type ModelKind = "default" | "bedrock" | "gemini" | "openai" | "litellm";

// HarnessFormValues is the flat, editable shape the wizard collects. It is
// deliberately simpler than the API request; toCreateInput / toUpdateRequest
// translate it (and fromHarness translates back for the update flow).
export interface HarnessFormValues {
  name: string;
  // model holds the fields of every provider flattened together; only the ones
  // the selected kind needs are shown, validated, and sent.
  model: { kind: ModelKind; modelId: string; apiKeyArn: string; apiBase: string };
  memory: { kind: MemoryKind; arn: string };
  tools: {
    browser: boolean;
    codeInterpreter: boolean;
    gatewayArn: string;
    mcpUrl: string;
  };
  systemPrompt: string;
  advanced: {
    executionRoleArn: string;
    networkMode: "PUBLIC" | "VPC";
    subnets: string;
    securityGroups: string;
    environmentVariables: string;
    maxIterations: string;
    maxTokens: string;
    timeoutSeconds: string;
  };
  // passthroughTools carries tools the form doesn't model (inline functions,
  // additional MCP servers, ...) so an update never silently drops them.
  passthroughTools: HarnessTool[];
}

export function emptyHarnessForm(): HarnessFormValues {
  return {
    name: "",
    model: { kind: "default", modelId: "", apiKeyArn: "", apiBase: "" },
    memory: { kind: "managed", arn: "" },
    tools: { browser: false, codeInterpreter: false, gatewayArn: "", mcpUrl: "" },
    systemPrompt: "",
    advanced: {
      executionRoleArn: "",
      networkMode: "PUBLIC",
      subnets: "",
      securityGroups: "",
      environmentVariables: "",
      maxIterations: "",
      maxTokens: "",
      timeoutSeconds: "",
    },
    passthroughTools: [],
  };
}

// fromHarness maps an existing harness into form values so the update flow
// starts from the current configuration.
export function fromHarness(harness: Harness): HarnessFormValues {
  const values = emptyHarnessForm();
  values.name = harness.harnessName ?? "";

  const memory = harness.memory;
  if (memory?.disabled) values.memory = { kind: "disabled", arn: "" };
  else if (memory?.agentCoreMemoryConfiguration) {
    values.memory = { kind: "byo", arn: memory.agentCoreMemoryConfiguration.arn ?? "" };
  } else {
    values.memory = { kind: "managed", arn: "" };
  }

  for (const tool of harness.tools ?? []) {
    if (tool.config?.agentCoreBrowser) values.tools.browser = true;
    else if (tool.config?.agentCoreCodeInterpreter) values.tools.codeInterpreter = true;
    else if (tool.config?.agentCoreGateway && values.tools.gatewayArn === "") {
      values.tools.gatewayArn = tool.config.agentCoreGateway.gatewayArn ?? "";
    } else if (tool.config?.remoteMcp && values.tools.mcpUrl === "") {
      values.tools.mcpUrl = tool.config.remoteMcp.url ?? "";
    } else {
      values.passthroughTools.push(tool);
    }
  }

  values.systemPrompt = (harness.systemPrompt ?? [])
    .map((block) => block.text ?? "")
    .filter((text) => text !== "")
    .join("\n");

  values.advanced.executionRoleArn = harness.executionRoleArn ?? "";
  const network = harness.environment?.agentCoreRuntimeEnvironment?.networkConfiguration;
  if (network?.networkMode === "VPC") {
    values.advanced.networkMode = "VPC";
    values.advanced.subnets = (network.networkModeConfig?.subnets ?? []).join(",");
    values.advanced.securityGroups = (network.networkModeConfig?.securityGroups ?? []).join(",");
  }
  values.advanced.environmentVariables = Object.entries(harness.environmentVariables ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
  const model = harness.model;
  if (model?.bedrockModelConfig) {
    values.model = {
      kind: "bedrock",
      modelId: model.bedrockModelConfig.modelId ?? "",
      apiKeyArn: "",
      apiBase: "",
    };
  } else if (model?.geminiModelConfig) {
    values.model = {
      kind: "gemini",
      modelId: model.geminiModelConfig.modelId ?? "",
      apiKeyArn: model.geminiModelConfig.apiKeyArn ?? "",
      apiBase: "",
    };
  } else if (model?.openAiModelConfig) {
    values.model = {
      kind: "openai",
      modelId: model.openAiModelConfig.modelId ?? "",
      apiKeyArn: model.openAiModelConfig.apiKeyArn ?? "",
      apiBase: "",
    };
  } else if (model?.liteLlmModelConfig) {
    values.model = {
      kind: "litellm",
      modelId: model.liteLlmModelConfig.modelId ?? "",
      apiKeyArn: model.liteLlmModelConfig.apiKeyArn ?? "",
      apiBase: model.liteLlmModelConfig.apiBase ?? "",
    };
  }
  values.advanced.maxIterations = harness.maxIterations?.toString() ?? "";
  values.advanced.maxTokens = harness.maxTokens?.toString() ?? "";
  values.advanced.timeoutSeconds = harness.timeoutSeconds?.toString() ?? "";
  return values;
}

// ─── form → request translation ───────────────────────────────────────────────

function toMemoryConfiguration(values: HarnessFormValues): HarnessMemoryConfiguration {
  switch (values.memory.kind) {
    case "managed":
      return { managedMemoryConfiguration: {} };
    case "byo":
      return { agentCoreMemoryConfiguration: { arn: values.memory.arn } };
    case "disabled":
      return { disabled: {} };
  }
}

// toModelConfiguration builds the provider member of the model union, or
// undefined for "default" (service default on create, keep current on update).
function toModelConfiguration(values: HarnessFormValues): CreateHarnessInput["model"] {
  const model = values.model;
  switch (model.kind) {
    case "default":
      return undefined;
    case "bedrock":
      return { bedrockModelConfig: { modelId: model.modelId } };
    case "gemini":
      return { geminiModelConfig: { modelId: model.modelId, apiKeyArn: model.apiKeyArn } };
    case "openai":
      return { openAiModelConfig: { modelId: model.modelId, apiKeyArn: model.apiKeyArn } };
    case "litellm":
      return {
        liteLlmModelConfig: {
          modelId: model.modelId,
          apiKeyArn: model.apiKeyArn || undefined,
          apiBase: model.apiBase || undefined,
        },
      };
  }
}

function toTools(values: HarnessFormValues): HarnessTool[] {
  const tools: HarnessTool[] = [];
  if (values.tools.browser) {
    tools.push({ type: "agentcore_browser", config: { agentCoreBrowser: {} } });
  }
  if (values.tools.codeInterpreter) {
    tools.push({
      type: "agentcore_code_interpreter",
      config: { agentCoreCodeInterpreter: {} },
    });
  }
  if (values.tools.gatewayArn !== "") {
    tools.push({
      type: "agentcore_gateway",
      config: { agentCoreGateway: { gatewayArn: values.tools.gatewayArn } },
    });
  }
  if (values.tools.mcpUrl !== "") {
    tools.push({ type: "remote_mcp", config: { remoteMcp: { url: values.tools.mcpUrl } } });
  }
  return [...tools, ...values.passthroughTools];
}

function parseCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

function parseEnvVars(raw: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const pair of parseCsv(raw)) {
    const eq = pair.indexOf("=");
    if (eq > 0) vars[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return vars;
}

function toNumber(raw: string): number | undefined {
  return raw === "" ? undefined : Number(raw);
}

// toEnvironment builds the environment provider request, or undefined when the
// defaults (public networking) apply.
function toEnvironment(values: HarnessFormValues): CreateHarnessInput["environment"] {
  if (values.advanced.networkMode !== "VPC") return undefined;
  return {
    agentCoreRuntimeEnvironment: {
      networkConfiguration: {
        networkMode: "VPC",
        networkModeConfig: {
          subnets: parseCsv(values.advanced.subnets),
          securityGroups: parseCsv(values.advanced.securityGroups),
        },
      },
    },
  };
}

// toCreateInput translates the form into the CreateHarness request. Fields left
// at their defaults are omitted so the service applies its own defaults.
export function toCreateInput(values: HarnessFormValues): CreateHarnessInput {
  const tools = toTools(values);
  const envVars = parseEnvVars(values.advanced.environmentVariables);
  return {
    harnessName: values.name,
    executionRoleArn: values.advanced.executionRoleArn || undefined,
    memory: toMemoryConfiguration(values),
    tools: tools.length > 0 ? tools : undefined,
    systemPrompt: values.systemPrompt !== "" ? [{ text: values.systemPrompt }] : undefined,
    environment: toEnvironment(values),
    environmentVariables: Object.keys(envVars).length > 0 ? envVars : undefined,
    model: toModelConfiguration(values),
    maxIterations: toNumber(values.advanced.maxIterations),
    maxTokens: toNumber(values.advanced.maxTokens),
    timeoutSeconds: toNumber(values.advanced.timeoutSeconds),
  };
}

// toUpdateRequest translates the form into an UpdateHarness request, including
// only the fields whose form value changed — UpdateHarness has PATCH semantics,
// and an untouched field should stay untouched on the service side too.
export function toUpdateRequest(
  harnessId: string,
  values: HarnessFormValues,
  initial: HarnessFormValues,
): UpdateHarnessRequest {
  const request: UpdateHarnessRequest = { harnessId };

  const memoryChanged =
    values.memory.kind !== initial.memory.kind || values.memory.arn !== initial.memory.arn;
  if (memoryChanged) request.memory = { optionalValue: toMemoryConfiguration(values) };

  const modelChanged = JSON.stringify(values.model) !== JSON.stringify(initial.model);
  if (modelChanged && values.model.kind !== "default") {
    request.model = toModelConfiguration(values);
  }

  if (JSON.stringify(values.tools) !== JSON.stringify(initial.tools)) {
    request.tools = toTools(values);
  }

  if (values.systemPrompt !== initial.systemPrompt && values.systemPrompt !== "") {
    request.systemPrompt = [{ text: values.systemPrompt }];
  }

  const advanced = values.advanced;
  const before = initial.advanced;
  if (advanced.executionRoleArn !== before.executionRoleArn && advanced.executionRoleArn !== "") {
    request.executionRoleArn = advanced.executionRoleArn;
  }
  if (
    advanced.networkMode !== before.networkMode ||
    advanced.subnets !== before.subnets ||
    advanced.securityGroups !== before.securityGroups
  ) {
    request.environment = toEnvironment(values) ?? {
      agentCoreRuntimeEnvironment: { networkConfiguration: { networkMode: "PUBLIC" } },
    };
  }
  if (advanced.environmentVariables !== before.environmentVariables) {
    request.environmentVariables = parseEnvVars(advanced.environmentVariables);
  }
  if (advanced.maxIterations !== before.maxIterations) {
    request.maxIterations = toNumber(advanced.maxIterations);
  }
  if (advanced.maxTokens !== before.maxTokens) request.maxTokens = toNumber(advanced.maxTokens);
  if (advanced.timeoutSeconds !== before.timeoutSeconds) {
    request.timeoutSeconds = toNumber(advanced.timeoutSeconds);
  }
  return request;
}

// ─── wizard shell ─────────────────────────────────────────────────────────────

type WizardPhase =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "success"; harnessId: string; version?: string; status?: string }
  | { kind: "error"; message: string };

export interface HarnessWizardProps extends ScreenProps {
  mode: "create" | "update";
  breadcrumb: string[];
  // harnessId is the update target (update mode only).
  harnessId?: string;
  // initial seeds the form (update mode: the current configuration).
  initial?: HarnessFormValues;
  // onDone is called after a successful submit is acknowledged.
  onDone: (harnessId: string) => void;
}

const NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,47}$/;

// HarnessWizard is the interactive step flow behind `harness create` and
// `harness update`: name → model → memory → tools → prompt → advanced
// (optional) → review, then submit. Update mode skips the name step (harnesses
// cannot be renamed) and submits only what changed.
export function HarnessWizard({
  ctx,
  core,
  mode,
  breadcrumb,
  harnessId,
  initial,
  onDone,
}: HarnessWizardProps) {
  const navigate = useNavigate();
  const opts = coreOptsFromCtx(ctx);

  const steps: Step[] = useMemo(() => {
    const all: Step[] = [
      { key: "name", title: "name" },
      { key: "model", title: "model" },
      { key: "memory", title: "memory" },
      { key: "tools", title: "tools" },
      { key: "prompt", title: "prompt" },
      { key: "advanced", title: "advanced" },
      { key: "review", title: "review" },
    ];
    return mode === "create" ? all : all.filter((step) => step.key !== "name");
  }, [mode]);

  const [initialValues] = useState<HarnessFormValues>(() => initial ?? emptyHarnessForm());
  const [values, setValues] = useState<HarnessFormValues>(initialValues);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<WizardPhase>({ kind: "form" });

  const stepKey = steps[stepIndex]!.key;
  const patch = (update: Partial<HarnessFormValues>) =>
    setValues((current) => ({ ...current, ...update }));

  const next = () => setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  const back = () => {
    if (stepIndex === 0) navigate(-1);
    else setStepIndex((i) => i - 1);
  };

  const request = useMemo(
    () =>
      mode === "create"
        ? toCreateInput(values)
        : toUpdateRequest(harnessId ?? "", values, initialValues),
    [mode, values, harnessId, initialValues],
  );

  const submit = async () => {
    setPhase({ kind: "submitting" });
    try {
      if (mode === "create") {
        const response = await core.harness.createHarness(toCreateInput(values), opts);
        setPhase({
          kind: "success",
          harnessId: response.harness?.harnessId ?? "",
          version: response.harness?.harnessVersion,
          status: response.harness?.status,
        });
      } else {
        const response = await core.harness.updateHarness(
          toUpdateRequest(harnessId!, values, initialValues),
          opts,
        );
        setPhase({
          kind: "success",
          harnessId: response.harness?.harnessId ?? harnessId!,
          version: response.harness?.harnessVersion,
          status: response.harness?.status,
        });
      }
    } catch (error) {
      setPhase({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const verb = mode === "create" ? "create" : "update";
  const keyHints = hintsFor(stepKey, phase, verb);

  return (
    <Layout breadcrumb={breadcrumb} keyHints={keyHints}>
      <Box flexDirection="column">
        <Box paddingX={1}>
          <Stepper
            steps={steps}
            currentStep={stepKey}
            completedSteps={steps.slice(0, stepIndex).map((step) => step.key)}
          />
        </Box>

        <Divider />

        {phase.kind === "form" && (
          <WizardStep
            stepKey={stepKey}
            mode={mode}
            values={values}
            patch={patch}
            request={request}
            onNext={next}
            onBack={back}
            onSubmit={submit}
          />
        )}
        {phase.kind === "submitting" && (
          <Spinner
            label={
              mode === "create"
                ? "creating harness… provisioning the execution role can take a moment"
                : "updating harness…"
            }
          />
        )}
        {phase.kind === "success" && (
          <SuccessPanel
            mode={mode}
            harnessId={phase.harnessId}
            version={phase.version}
            status={phase.status}
            onContinue={() => onDone(phase.harnessId)}
          />
        )}
        {phase.kind === "error" && (
          <ErrorPanel message={phase.message} onBack={() => setPhase({ kind: "form" })} />
        )}
      </Box>
    </Layout>
  );
}

function hintsFor(
  stepKey: string,
  phase: WizardPhase,
  verb: string,
): { key: string; label: string }[] {
  if (phase.kind === "submitting") return [{ key: "ctl+c", label: "quit" }];
  if (phase.kind === "success") return [{ key: "enter", label: "continue" }];
  if (phase.kind === "error")
    return [
      { key: "esc", label: "back" },
      { key: "ctl+c", label: "quit" },
    ];
  const base = [
    { key: "esc", label: "back" },
    { key: "ctl+c", label: "quit" },
  ];
  switch (stepKey) {
    case "name":
      return [{ key: "enter", label: "continue" }, ...base];
    case "model":
    case "memory":
      return [{ key: "↑↓", label: "choose" }, { key: "enter", label: "continue" }, ...base];
    case "tools":
      return [
        { key: "↑↓", label: "move" },
        { key: "space", label: "toggle" },
        { key: "enter", label: "continue" },
        ...base,
      ];
    case "prompt":
      return [{ key: "enter", label: "newline" }, { key: "ctl+d", label: "continue" }, ...base];
    case "advanced":
      return [{ key: "↑↓", label: "move" }, { key: "enter", label: "select" }, ...base];
    case "review":
      return [{ key: "enter", label: verb }, { key: "↑↓", label: "scroll" }, ...base];
    default:
      return base;
  }
}

interface WizardStepProps {
  stepKey: string;
  mode: "create" | "update";
  values: HarnessFormValues;
  patch: (update: Partial<HarnessFormValues>) => void;
  request: unknown;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}

function WizardStep({
  stepKey,
  mode,
  values,
  patch,
  request,
  onNext,
  onBack,
  onSubmit,
}: WizardStepProps) {
  switch (stepKey) {
    case "name":
      return (
        <NameStep
          value={values.name}
          onChange={(name) => patch({ name })}
          onNext={onNext}
          onBack={onBack}
        />
      );
    case "model":
      return (
        <ModelStep
          mode={mode}
          value={values.model}
          onChange={(model) => patch({ model })}
          onNext={onNext}
          onBack={onBack}
        />
      );
    case "memory":
      return (
        <MemoryStep
          value={values.memory}
          onChange={(memory) => patch({ memory })}
          onNext={onNext}
          onBack={onBack}
        />
      );
    case "tools":
      return (
        <ToolsStep
          value={values.tools}
          onChange={(tools) => patch({ tools })}
          onNext={onNext}
          onBack={onBack}
        />
      );
    case "prompt":
      return (
        <PromptStep
          value={values.systemPrompt}
          onChange={(systemPrompt) => patch({ systemPrompt })}
          onNext={onNext}
          onBack={onBack}
        />
      );
    case "advanced":
      return (
        <AdvancedStep
          mode={mode}
          value={values.advanced}
          onChange={(advanced) => patch({ advanced })}
          onNext={onNext}
          onBack={onBack}
        />
      );
    case "review":
      return <ReviewStep mode={mode} request={request} onSubmit={onSubmit} onBack={onBack} />;
    default:
      return null;
  }
}

// ─── step: name ───────────────────────────────────────────────────────────────

// Question is the one-line prompt under the stepper. The stepper already names
// the step, so the body opens with the question itself and lets the
// interactive rows below carry the visual weight.
function Question({ text }: { text: string }) {
  return <Text color={theme.colors.muted}>{text}</Text>;
}

function NameStep({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  useInput((_input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.return && NAME_PATTERN.test(value)) onNext();
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <FormTextInput
        name="the name of your harness"
        helpText="letters, numbers, underscores; must start with a letter"
        errorText="must start with a letter; letters, numbers, and underscores only"
        placeholder="my_agent"
        value={value}
        onChange={onChange}
        pattern={NAME_PATTERN}
      />
    </Box>
  );
}

// ─── step: model ──────────────────────────────────────────────────────────────

type ModelFieldKey = "modelId" | "apiKeyArn" | "apiBase";

interface ModelField {
  key: ModelFieldKey;
  name: string;
  helpText: string;
  placeholder: string;
  // required fields block continuing while empty; optional ones are omitted
  // from the request when left empty.
  required: boolean;
  requiredError: string;
}

// MODEL_PROVIDERS mirrors the API's HarnessModelConfiguration union: one row
// per provider, plus the "default" opt-out, each declaring the fields the
// provider needs.
const MODEL_PROVIDERS: {
  kind: ModelKind;
  label: string;
  description: string;
  fields: ModelField[];
}[] = [
  {
    kind: "default",
    label: "service default",
    description: "let the service choose the model (recommended)",
    fields: [],
  },
  {
    kind: "bedrock",
    label: "bedrock",
    description: "an amazon bedrock model",
    fields: [
      {
        key: "modelId",
        name: "model id",
        helpText: "a bedrock model or inference profile id",
        placeholder: "us.anthropic.claude-sonnet-4-6",
        required: true,
        requiredError: "enter a bedrock model or inference profile id",
      },
    ],
  },
  {
    kind: "gemini",
    label: "gemini",
    description: "a google gemini model",
    fields: [
      {
        key: "modelId",
        name: "model id",
        helpText: "the gemini model to use",
        placeholder: "gemini-2.5-pro",
        required: true,
        requiredError: "enter a gemini model id",
      },
      {
        key: "apiKeyArn",
        name: "api key arn",
        helpText: "the arn of your gemini api key in agentcore identity",
        placeholder: "arn:aws:bedrock-agentcore:…:token-vault/…",
        required: true,
        requiredError: "enter the arn of your gemini api key",
      },
    ],
  },
  {
    kind: "openai",
    label: "openai",
    description: "an openai model",
    fields: [
      {
        key: "modelId",
        name: "model id",
        helpText: "the openai model to use",
        placeholder: "gpt-5",
        required: true,
        requiredError: "enter an openai model id",
      },
      {
        key: "apiKeyArn",
        name: "api key arn",
        helpText: "the arn of your openai api key in agentcore identity",
        placeholder: "arn:aws:bedrock-agentcore:…:token-vault/…",
        required: true,
        requiredError: "enter the arn of your openai api key",
      },
    ],
  },
  {
    kind: "litellm",
    label: "litellm",
    description: "any third-party provider via litellm",
    fields: [
      {
        key: "modelId",
        name: "model id",
        helpText: "the litellm model identifier (provider/model)",
        placeholder: "anthropic/claude-3-sonnet",
        required: true,
        requiredError: "enter a litellm model identifier",
      },
      {
        key: "apiKeyArn",
        name: "api key arn",
        helpText: "optional · the arn of the provider api key in agentcore identity",
        placeholder: "arn:aws:bedrock-agentcore:…:token-vault/…",
        required: false,
        requiredError: "",
      },
      {
        key: "apiBase",
        name: "api base url",
        helpText: "optional · the base url of the provider's api endpoint",
        placeholder: "https://…",
        required: false,
        requiredError: "",
      },
    ],
  },
];

function ModelStep({
  mode,
  value,
  onChange,
  onNext,
  onBack,
}: {
  mode: "create" | "update";
  value: HarnessFormValues["model"];
  onChange: (value: HarnessFormValues["model"]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const index = MODEL_PROVIDERS.findIndex((provider) => provider.kind === value.kind);
  const provider = MODEL_PROVIDERS[index]!;
  // focusedField indexes into provider.fields while editing; null while the
  // radio list has focus.
  const [focusedField, setFocusedField] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useInput((_input, key) => {
    if (focusedField === null) {
      if (key.escape) {
        onBack();
        return;
      }
      if (key.upArrow) {
        onChange({ ...value, kind: MODEL_PROVIDERS[Math.max(0, index - 1)]!.kind });
        setError(null);
        return;
      }
      if (key.downArrow) {
        const next = MODEL_PROVIDERS[Math.min(MODEL_PROVIDERS.length - 1, index + 1)]!;
        onChange({ ...value, kind: next.kind });
        setError(null);
        return;
      }
      if (key.return) {
        if (provider.fields.length === 0) onNext();
        else setFocusedField(0);
      }
      return;
    }

    // A field is focused; its TextInput owns text editing.
    if (key.escape) {
      setFocusedField(null);
      setError(null);
      return;
    }
    if (key.upArrow) {
      setFocusedField(focusedField === 0 ? null : focusedField - 1);
      setError(null);
      return;
    }
    if (key.downArrow) {
      setFocusedField(Math.min(provider.fields.length - 1, focusedField + 1));
      setError(null);
      return;
    }
    if (key.return) {
      const field = provider.fields[focusedField]!;
      if (field.required && value[field.key].trim() === "") {
        setError(field.requiredError);
        return;
      }
      if (focusedField < provider.fields.length - 1) {
        setFocusedField(focusedField + 1);
        return;
      }
      // Last field: every required field must be filled before moving on.
      const missing = provider.fields.findIndex(
        (other) => other.required && value[other.key].trim() === "",
      );
      if (missing >= 0) {
        setFocusedField(missing);
        setError(provider.fields[missing]!.requiredError);
        return;
      }
      onNext();
    }
  });

  const rows: FormRadioOption[] = MODEL_PROVIDERS.map((row) =>
    row.kind === "default" && mode === "update"
      ? { label: "keep current", description: "leave the model configuration untouched" }
      : { label: row.label, description: row.description },
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      <FormRadioGroup
        name="choose a model"
        helpText="the provider and model that will power the harness"
        options={rows}
        selectedIndex={index}
      />
      {provider.fields.map((field, i) => (
        <FormTextInput
          key={`${provider.kind}.${field.key}`}
          name={field.name}
          helpText={field.helpText}
          placeholder={field.placeholder}
          errorText=""
          value={value[field.key]}
          onChange={(next) => {
            onChange({ ...value, [field.key]: next });
            setError(null);
          }}
          focused={focusedField === i}
        />
      ))}
      {error && <Text color={theme.colors.error}>{error}</Text>}
      {index !== 0 && (
        <Text color={theme.colors.info}>
          use the command line to pass additional params, e.g.,{" "}
          <Text color={theme.colors.primary}>agentcore harness create --name …</Text>
        </Text>
      )}
    </Box>
  );
}

// ─── step: memory ─────────────────────────────────────────────────────────────

const MEMORY_OPTIONS: { kind: MemoryKind; label: string; description: string }[] = [
  {
    kind: "managed",
    label: "managed",
    description: "agentcore creates and manages memory for you (recommended)",
  },
  {
    kind: "byo",
    label: "bring your own",
    description: "use an existing agentcore memory resource",
  },
  { kind: "disabled", label: "disabled", description: "no memory across sessions" },
];

function MemoryStep({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: HarnessFormValues["memory"];
  onChange: (value: HarnessFormValues["memory"]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const index = MEMORY_OPTIONS.findIndex((option) => option.kind === value.kind);
  // editing is true while the byo arn field has focus; the radio list has
  // focus otherwise.
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useInput((_input, key) => {
    if (!editing) {
      if (key.escape) {
        onBack();
        return;
      }
      if (key.upArrow) {
        onChange({ ...value, kind: MEMORY_OPTIONS[Math.max(0, index - 1)]!.kind });
        setError(null);
        return;
      }
      if (key.downArrow) {
        const next = MEMORY_OPTIONS[Math.min(MEMORY_OPTIONS.length - 1, index + 1)]!;
        onChange({ ...value, kind: next.kind });
        setError(null);
        return;
      }
      if (key.return) {
        if (value.kind === "byo") setEditing(true);
        else onNext();
      }
      return;
    }

    // The arn field is focused; its TextInput owns text editing.
    if (key.escape || key.upArrow) {
      setEditing(false);
      setError(null);
      return;
    }
    if (key.return) {
      if (value.arn.trim() === "") {
        setError("enter the arn of your agentcore memory resource");
        return;
      }
      onNext();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <FormRadioGroup
        name="choose a memory configuration"
        helpText="how should the harness remember conversations?"
        options={MEMORY_OPTIONS}
        selectedIndex={index}
      />
      {value.kind === "byo" && (
        <FormTextInput
          name="memory arn"
          helpText="the arn of an existing agentcore memory resource"
          placeholder="arn:aws:bedrock-agentcore:…:memory/…"
          errorText=""
          value={value.arn}
          onChange={(arn) => {
            onChange({ ...value, arn });
            setError(null);
          }}
          focused={editing}
        />
      )}
      {error && <Text color={theme.colors.error}>{error}</Text>}
    </Box>
  );
}

// ─── step: tools ──────────────────────────────────────────────────────────────

type ToolRowKey = "browser" | "codeInterpreter" | "gateway" | "mcp";

const TOOL_ROWS: { key: ToolRowKey; label: string; description: string; input?: string }[] = [
  { key: "browser", label: "browser", description: "browse the web with agentcore browser" },
  {
    key: "codeInterpreter",
    label: "code interpreter",
    description: "run code in a sandbox",
  },
  {
    key: "gateway",
    label: "gateway",
    description: "call tools through an agentcore gateway",
    input: "gateway arn",
  },
  {
    key: "mcp",
    label: "mcp server",
    description: "connect to a remote mcp server",
    input: "server url",
  },
];

function ToolsStep({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: HarnessFormValues["tools"];
  onChange: (value: HarnessFormValues["tools"]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [cursor, setCursor] = useState(0);
  const [editing, setEditing] = useState<"gateway" | "mcp" | null>(null);
  const [draft, setDraft] = useState("");

  const enabled = (key: ToolRowKey): boolean => {
    switch (key) {
      case "browser":
        return value.browser;
      case "codeInterpreter":
        return value.codeInterpreter;
      case "gateway":
        return value.gatewayArn !== "";
      case "mcp":
        return value.mcpUrl !== "";
    }
  };

  const toggle = (key: ToolRowKey) => {
    switch (key) {
      case "browser":
        onChange({ ...value, browser: !value.browser });
        return;
      case "codeInterpreter":
        onChange({ ...value, codeInterpreter: !value.codeInterpreter });
        return;
      case "gateway":
        if (value.gatewayArn !== "") onChange({ ...value, gatewayArn: "" });
        else {
          setDraft("");
          setEditing("gateway");
        }
        return;
      case "mcp":
        if (value.mcpUrl !== "") onChange({ ...value, mcpUrl: "" });
        else {
          setDraft("");
          setEditing("mcp");
        }
        return;
    }
  };

  useInput((input, key) => {
    if (editing) {
      // The TextInput owns text editing; this handler only closes the edit.
      if (key.escape) {
        setEditing(null);
        return;
      }
      if (key.return) {
        const committed = draft.trim();
        if (editing === "gateway") onChange({ ...value, gatewayArn: committed });
        else onChange({ ...value, mcpUrl: committed });
        setEditing(null);
      }
      return;
    }
    if (key.escape) {
      onBack();
      return;
    }
    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    if (key.downArrow) {
      setCursor((c) => Math.min(TOOL_ROWS.length - 1, c + 1));
      return;
    }
    if (input === " ") {
      toggle(TOOL_ROWS[cursor]!.key);
      return;
    }
    if (key.return) {
      onNext();
    }
  });

  const editedRow = TOOL_ROWS.find((row) => row.key === editing);

  return (
    <Box flexDirection="column">
      <Question text="which tools should the agent be able to use?" />
      {TOOL_ROWS.map((row, i) => {
        const isCursor = i === cursor && !editing;
        const isOn = enabled(row.key);
        const detail =
          row.key === "gateway" && value.gatewayArn !== ""
            ? value.gatewayArn
            : row.key === "mcp" && value.mcpUrl !== ""
              ? value.mcpUrl
              : row.description;
        return (
          <Box key={row.key}>
            <Text color={isCursor ? theme.colors.focus : theme.colors.muted}>
              {isCursor ? "❯ " : "  "}
            </Text>
            <Text color={isOn ? theme.colors.success : theme.colors.muted}>
              {isOn ? "[✓] " : "[ ] "}
            </Text>
            <Text bold={isCursor} color={isCursor ? theme.colors.focus : theme.colors.text}>
              {row.label.padEnd(18)}
            </Text>
            <Text color={isOn ? theme.colors.text : theme.colors.muted}>{detail}</Text>
          </Box>
        );
      })}
      {editing && editedRow && (
        <TextInput
          label={editedRow.input}
          value={draft}
          onChange={setDraft}
          placeholder={
            editing === "gateway" ? "arn:aws:bedrock-agentcore:…:gateway/…" : "https://…"
          }
        />
      )}
      {editing && (
        <Text color={theme.colors.muted}>
          {"  enter saves · esc cancels · empty disables the tool"}
        </Text>
      )}
    </Box>
  );
}

// ─── step: prompt ─────────────────────────────────────────────────────────────

const PROMPT_PREVIEW_LINES = 10;

function PromptStep({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  // A tiny multiline editor: append-only typing/pasting plus backspace. Pasted
  // chunks arrive as one input string whose \r become newlines, so multi-line
  // paste just works; enter inserts a newline; ctrl+d moves on.
  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.ctrl && input === "d") {
      onNext();
      return;
    }
    if (key.return) {
      onChange(value + "\n");
      return;
    }
    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }
    if (key.ctrl || key.meta) return;
    if (input !== "") {
      onChange(value + input.replace(/\r/g, "\n"));
    }
  });

  const lines = value === "" ? [] : value.split("\n");
  const hidden = Math.max(0, lines.length - PROMPT_PREVIEW_LINES);
  const visible = lines.slice(hidden);

  return (
    <Box flexDirection="column">
      <Question text="type or paste the agent's instructions · empty skips" />
      {hidden > 0 && <Text color={theme.colors.muted}>│ … (+{hidden} earlier lines)</Text>}
      {visible.length === 0 ? (
        <Text color={theme.colors.muted}>
          │ You are a helpful assistant…<Text inverse> </Text>
        </Text>
      ) : (
        visible.map((line, i) => (
          <Text key={i}>
            <Text color={theme.colors.border}>│ </Text>
            {line}
            {i === visible.length - 1 ? <Text inverse> </Text> : null}
          </Text>
        ))
      )}
      {value !== "" && (
        <Text color={theme.colors.muted}>{`  ${value.length} chars · ctrl+d continues`}</Text>
      )}
    </Box>
  );
}

// ─── step: advanced ───────────────────────────────────────────────────────────

type AdvancedFieldKey = keyof HarnessFormValues["advanced"];

interface AdvancedField {
  key: AdvancedFieldKey;
  label: string;
  placeholder: string;
  numeric?: boolean;
  vpcOnly?: boolean;
}

const ADVANCED_FIELDS: AdvancedField[] = [
  { key: "executionRoleArn", label: "execution role", placeholder: "arn:aws:iam::…:role/…" },
  { key: "networkMode", label: "network mode", placeholder: "" },
  { key: "subnets", label: "subnets", placeholder: "subnet-…,subnet-…", vpcOnly: true },
  {
    key: "securityGroups",
    label: "security groups",
    placeholder: "sg-…,sg-…",
    vpcOnly: true,
  },
  { key: "environmentVariables", label: "environment vars", placeholder: "KEY=value,OTHER=value" },
  { key: "maxIterations", label: "max iterations", placeholder: "e.g. 50", numeric: true },
  { key: "maxTokens", label: "max tokens", placeholder: "e.g. 64000", numeric: true },
  { key: "timeoutSeconds", label: "timeout seconds", placeholder: "e.g. 900", numeric: true },
];

function AdvancedStep({
  mode,
  value,
  onChange,
  onNext,
  onBack,
}: {
  mode: "create" | "update";
  value: HarnessFormValues["advanced"];
  onChange: (value: HarnessFormValues["advanced"]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [configuring, setConfiguring] = useState(false);
  const [choice, setChoice] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [editing, setEditing] = useState<AdvancedFieldKey | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fields = ADVANCED_FIELDS.filter((field) => !field.vpcOnly || value.networkMode === "VPC");
  // rows = fields plus the trailing "Done" row.
  const rowCount = fields.length + 1;

  useInput((input, key) => {
    if (!configuring) {
      if (key.escape) {
        onBack();
        return;
      }
      if (key.upArrow || key.downArrow) {
        setChoice((c) => (c === 0 ? 1 : 0));
        return;
      }
      if (key.return) {
        if (choice === 0) onNext();
        else setConfiguring(true);
      }
      return;
    }

    if (editing) {
      if (key.escape) {
        setEditing(null);
        setError(null);
        return;
      }
      if (key.return) {
        const field = ADVANCED_FIELDS.find((f) => f.key === editing)!;
        const committed = draft.trim();
        if (field.numeric && committed !== "" && !/^\d+$/.test(committed)) {
          setError("enter a whole number, or leave empty to unset");
          return;
        }
        onChange({ ...value, [editing]: committed });
        setEditing(null);
        setError(null);
      }
      return;
    }

    if (key.escape) {
      setConfiguring(false);
      return;
    }
    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    if (key.downArrow) {
      setCursor((c) => Math.min(rowCount - 1, c + 1));
      return;
    }
    if (key.return || input === " ") {
      if (cursor === fields.length) {
        if (key.return) onNext();
        return;
      }
      const field = fields[cursor]!;
      if (field.key === "networkMode") {
        onChange({ ...value, networkMode: value.networkMode === "PUBLIC" ? "VPC" : "PUBLIC" });
        return;
      }
      if (key.return) {
        setDraft(value[field.key]);
        setEditing(field.key);
      }
    }
  });

  if (!configuring) {
    return (
      <Box flexDirection="column">
        <FormRadioGroup
          name="advanced options"
          helpText="configure advanced options?"
          options={[
            {
              label: "no — use the defaults",
              description: "most harnesses run fine on them (recommended)",
            },
            {
              label: "yes — configure",
              description: "networking, execution role, limits, env vars",
            },
          ]}
          selectedIndex={choice}
        />
      </Box>
    );
  }

  const display = (field: AdvancedField): string => {
    if (field.key === "networkMode") return value.networkMode;
    const raw = value[field.key];
    if (raw !== "") return raw;
    if (field.key === "executionRoleArn") {
      return mode === "create" ? "(create a default role)" : "(keep current role)";
    }
    return "—";
  };

  const editedField = ADVANCED_FIELDS.find((field) => field.key === editing);

  return (
    <Box flexDirection="column">
      <Question text="enter edits a field · network mode toggles" />
      {fields.map((field, i) => {
        const isCursor = i === cursor && !editing;
        const raw = field.key === "networkMode" ? value.networkMode : value[field.key];
        return (
          <Box key={field.key}>
            <Text color={isCursor ? theme.colors.focus : theme.colors.muted}>
              {isCursor ? "❯ " : "  "}
            </Text>
            <Text bold={isCursor} color={isCursor ? theme.colors.focus : theme.colors.text}>
              {field.label.padEnd(20)}
            </Text>
            <Text color={raw !== "" ? theme.colors.text : theme.colors.muted}>
              {display(field)}
            </Text>
          </Box>
        );
      })}
      <Box>
        <Text
          color={cursor === fields.length && !editing ? theme.colors.focus : theme.colors.muted}
        >
          {cursor === fields.length && !editing ? "❯ " : "  "}
        </Text>
        <Text
          bold={cursor === fields.length && !editing}
          color={cursor === fields.length && !editing ? theme.colors.focus : theme.colors.text}
        >
          done — continue
        </Text>
      </Box>
      {editing && editedField && (
        <Box flexDirection="column">
          <TextInput
            label={editedField.label}
            value={draft}
            onChange={(next) => {
              setDraft(next);
              setError(null);
            }}
            placeholder={editedField.placeholder}
          />
          <Text color={error ? theme.colors.error : theme.colors.muted}>
            {"  " + (error ?? "enter saves · esc cancels · empty resets to the default")}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// ─── step: review ─────────────────────────────────────────────────────────────

function ReviewStep({
  mode,
  request,
  onSubmit,
  onBack,
}: {
  mode: "create" | "update";
  request: unknown;
  onSubmit: () => void;
  onBack: () => void;
}) {
  useInput((_input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.return) onSubmit();
  });

  return (
    <Box flexDirection="column">
      <Question
        text={
          mode === "create"
            ? "this request will be sent to CreateHarness"
            : "only the changed fields are sent to UpdateHarness"
        }
      />
      <ScrollView>
        <CodeBlock
          language="json"
          showLineNumbers={false}
          showBorder={false}
          code={JSON.stringify(request, null, 2)}
        />
      </ScrollView>
    </Box>
  );
}

// ─── result panels ────────────────────────────────────────────────────────────

function SuccessPanel({
  mode,
  harnessId,
  version,
  status,
  onContinue,
}: {
  mode: "create" | "update";
  harnessId: string;
  version?: string;
  status?: string;
  onContinue: () => void;
}) {
  useInput((_input, key) => {
    if (key.return || key.escape) onContinue();
  });

  return (
    <Box flexDirection="column">
      <Text color={theme.colors.success} bold>
        ✔ harness {mode === "create" ? "created" : "updated"}
      </Text>
      <Text>
        {"  "}
        {harnessId}
        {version ? ` · v${version}` : ""}
        {status ? ` · ${status}` : ""}
      </Text>
      <Text color={theme.colors.muted}>
        {mode === "create"
          ? "  provisioning continues in the background · enter opens the harness"
          : "  the new version is deploying · enter opens the harness"}
      </Text>
    </Box>
  );
}

function ErrorPanel({ message, onBack }: { message: string; onBack: () => void }) {
  useInput((_input, key) => {
    if (key.escape || key.return) onBack();
  });

  return (
    <Box flexDirection="column">
      <Text color={theme.colors.error}>✗ {message}</Text>
      <Text color={theme.colors.muted}>{"  esc returns to the form"}</Text>
    </Box>
  );
}

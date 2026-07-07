import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import type { ScreenProps } from "../../types";
import { coreOptsFromCtx } from "../../utils";
import { Spinner } from "../../../components/ui/spinner";
import { Layout } from "../../../components/Layout";
import { JsonDetail } from "../../../components/JsonDetail";
import { darkTheme } from "../../../components/ui/_core.js";

const theme = darkTheme;

// The actions offered for a harness, in menu order. Each routes into the
// corresponding flow with the harness preselected.
const ACTIONS: { name: string; description: string; to: (id: string) => string }[] = [
  {
    name: "detail",
    description: "show the full JSON definition",
    to: (id) => `/agentcore/harness/get/${id}/json`,
  },
  {
    name: "endpoints",
    description: "list this harness's endpoints",
    to: (id) => `/agentcore/harness/list-endpoints/${id}`,
  },
  {
    name: "versions",
    description: "list this harness's versions",
    to: (id) => `/agentcore/harness/list-versions/${id}`,
  },
  {
    name: "invoke",
    description: "chat with this harness",
    to: (id) => `/agentcore/harness/invoke/${id}`,
  },
  {
    name: "exec",
    description: "run shell commands in this harness",
    to: (id) => `/agentcore/harness/exec/${id}`,
  },
];

// HarnessGetScreen is the hub for a single harness: a summary overlay (name,
// ARN, execution role, status) above an action selector that jumps into the
// harness's flows (detail JSON, endpoints, versions, invoke, exec). The harness
// ID comes from the `:harnessId` route path value.
export function HarnessGetScreen({ ctx, core }: ScreenProps) {
  const opts = coreOptsFromCtx(ctx);
  const navigate = useNavigate();
  const { harnessId } = useParams();

  const detail = useQuery({
    queryKey: ["harness", opts.region, harnessId],
    queryFn: () => core.harness.getHarness(harnessId!, opts),
    enabled: harnessId !== undefined,
  });

  const [index, setIndex] = useState(0);

  useInput((_input, key) => {
    if (key.escape) {
      navigate(-1);
      return;
    }
    if (key.upArrow) {
      setIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setIndex((i) => Math.min(ACTIONS.length - 1, i + 1));
      return;
    }
    if (key.return && harnessId) {
      navigate(ACTIONS[index]!.to(harnessId));
    }
  });

  const harness = detail.data?.harness;
  const nameWidth = ACTIONS.reduce((m, a) => Math.max(m, a.name.length), 0) + 3;

  return (
    <Layout
      breadcrumb={["agentcore", "harness", "get", harnessId ?? ""]}
      keyHints={[
        { key: "↑↓", label: "navigate" },
        { key: "enter", label: "select" },
        { key: "esc", label: "back" },
        { key: "ctl+c", label: "quit" },
      ]}
    >
      {detail.isPending ? (
        <Spinner label="Loading harness…" />
      ) : detail.isError ? (
        <Text color="red">Error: {(detail.error as Error).message}</Text>
      ) : (
        <Box flexDirection="column" paddingX={1}>
          {/* Summary overlay */}
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.colors.border}
            paddingX={1}
            marginBottom={1}
          >
            <Text bold>{harness?.harnessName ?? harnessId}</Text>
            <Text>
              <Text color={theme.colors.muted}>{"arn     "}</Text>
              {harness?.arn ?? "-"}
            </Text>
            <Text>
              <Text color={theme.colors.muted}>{"role    "}</Text>
              {harness?.executionRoleArn ?? "-"}
            </Text>
            <Text>
              <Text color={theme.colors.muted}>{"status  "}</Text>
              <Text
                color={
                  harness?.status === "READY"
                    ? theme.colors.success
                    : harness?.status?.endsWith("FAILED")
                      ? theme.colors.error
                      : theme.colors.text
                }
              >
                {harness?.status ?? "-"}
              </Text>
              {harness?.harnessVersion ? (
                <Text color={theme.colors.muted}>{`   version ${harness.harnessVersion}`}</Text>
              ) : null}
            </Text>
          </Box>

          {/* Action selector */}
          <Box flexDirection="column">
            {ACTIONS.map((action, i) => {
              const isHl = i === index;
              return (
                <Box key={action.name}>
                  <Text color={theme.colors.focus}>{isHl ? "❯ " : "  "}</Text>
                  <Text bold={isHl} color={isHl ? theme.colors.focus : theme.colors.text}>
                    {action.name.padEnd(nameWidth)}
                  </Text>
                  <Text color={theme.colors.muted}>{action.description}</Text>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Layout>
  );
}

// HarnessGetJsonScreen renders the harness's full definition as scrollable JSON
// (the hub's "detail" action).
export function HarnessGetJsonScreen({ ctx, core }: ScreenProps) {
  const opts = coreOptsFromCtx(ctx);
  const { harnessId } = useParams();

  const detail = useQuery({
    queryKey: ["harness", opts.region, harnessId],
    queryFn: () => core.harness.getHarness(harnessId!, opts),
    enabled: harnessId !== undefined,
  });

  return (
    <JsonDetail
      breadcrumb={["agentcore", "harness", "get", harnessId ?? "", "json"]}
      isPending={detail.isPending}
      error={detail.isError ? (detail.error as Error) : null}
      data={detail.data?.harness}
      loadingLabel="Loading harness…"
    />
  );
}

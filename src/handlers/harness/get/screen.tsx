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
import { KeyValueTable } from "../../../components/KeyValueTable.js";
import { Divider } from "../../../components/ui/divider/Divider.js";

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
    to: (id) => `/agentcore/harness/endpoint/list/${id}`,
  },
  {
    name: "versions",
    description: "list this harness's versions",
    to: (id) => `/agentcore/harness/version/list/${id}`,
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
  {
    name: "update",
    description: "update this harness",
    to: (id) => `/agentcore/harness/update/${id}`,
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

  useInput((input, key) => {
    if (key.escape) {
      navigate(-1);
      return;
    }
    if (key.upArrow || input === "k") {
      setIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow || input == "j") {
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
        { key: "↑↓/kj", label: "navigate" },
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
        <Box flexDirection="column">
          {/* Summary overlay */}
          <Box flexDirection="column" paddingLeft={1}>
            <KeyValueTable
              items={{
                id: harness?.harnessId ?? "",
                status: harness?.status ?? "",
                version: harness?.harnessVersion?.toString() ?? "0",
                arn: harness?.arn ?? "",
              }}
            />
          </Box>

          <Divider />

          {/* Action selector */}
          <Box flexDirection="column" paddingLeft={1}>
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

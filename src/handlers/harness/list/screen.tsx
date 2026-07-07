import { Text, useWindowSize } from "ink";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type { HarnessSummary } from "@aws-sdk/client-bedrock-agentcore-control";
import { DataTable } from "../../../components/ui/data-table";
import type { ScreenProps } from "../../types";
import { coreOptsFromCtx } from "../../utils";
import { Spinner } from "../../../components/ui/spinner";
import { Layout } from "../../../components/Layout";

// HarnessRow is the flat, display-ready shape the table renders. It also satisfies
// DataTable's `T extends Record<string, unknown>` constraint, which the SDK's
// HarnessSummary interface does not.
interface HarnessRow extends Record<string, unknown> {
  harnessId: string;
  harnessName: string;
  updatedAt: string;
  harnessVersion: string;
  status: string;
}

// toRow flattens a HarnessSummary into a HarnessRow, formatting dates and filling
// the SDK's optional fields with a placeholder.
function toRow(h: HarnessSummary): HarnessRow {
  return {
    harnessId: h.harnessId!,
    harnessName: h.harnessName!,
    updatedAt: h.updatedAt!.toISOString(),
    harnessVersion: h.harnessVersion!,
    status: h.status!,
  };
}

// HarnessListScreen lists the caller's harnesses in a table; selecting one pushes
// to HarnessGetScreen with the harness ID as a path value.
export function HarnessListScreen({ ctx, core }: ScreenProps) {
  const opts = coreOptsFromCtx(ctx);
  const { columns } = useWindowSize();
  const navigate = useNavigate();

  const list = useQuery({
    queryKey: ["harnesses", opts.region],
    queryFn: () => core.harness.listHarnesses(undefined, undefined, opts),
  });

  return (
    <Layout
      breadcrumb={["agentcore", "harness", "list"]}
      keyHints={[
        { key: "↑↓/jk", label: "navigate" },
        { key: "/", label: "filter" },
        { key: "enter", label: "select" },
        { key: "esc", label: "back" },
        { key: "ctl+c", label: "quit" },
      ]}
    >
      {list.isPending ? (
        <Spinner label="Loading harnesses…" />
      ) : list.isError ? (
        <Text color="red">Error: {(list.error as Error).message}</Text>
      ) : (
        <DataTable
          borderStyle="none"
          borderTop={false}
          borderBottom={false}
          borderRight={false}
          showFooter={false}
          showDivider={true}
          columns={[
            { key: "harnessName", header: "Name", width: columns - 62 },
            { key: "updatedAt", header: "UpdatedAt", width: 30 },
            { key: "harnessVersion", header: "Version", width: 10 },
            { key: "status", header: "Status", width: 20 },
          ]}
          data={(list.data.harnesses ?? []).map(toRow)}
          onSelect={(row) => {
            if (row.harnessId !== "—") navigate(`/agentcore/harness/get/${row.harnessId}`);
          }}
          onEscape={() => navigate("/agentcore/harness")}
        />
      )}
    </Layout>
  );
}

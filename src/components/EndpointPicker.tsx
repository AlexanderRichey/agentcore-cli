import { Text, useWindowSize } from "ink";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type { HarnessEndpoint } from "@aws-sdk/client-bedrock-agentcore-control";
import { DataTable } from "./ui/data-table";
import type { ScreenProps } from "../handlers/types";
import { coreOptsFromCtx } from "../handlers/utils";
import { Spinner } from "./ui/spinner";
import { Layout } from "./Layout";

// EndpointRow is the flat, display-ready shape the table renders.
interface EndpointRow extends Record<string, unknown> {
  endpointName: string;
  liveVersion: string;
  targetVersion: string;
  status: string;
  updatedAt: string;
}

function toRow(e: HarnessEndpoint): EndpointRow {
  return {
    endpointName: e.endpointName!,
    liveVersion: e.liveVersion ?? "-",
    targetVersion: e.targetVersion ?? "-",
    status: e.status!,
    updatedAt: e.updatedAt!.toISOString(),
  };
}

export interface EndpointPickerProps extends ScreenProps {
  // harnessId scopes the listing to one harness's endpoints.
  harnessId: string;
  // breadcrumb labels the screen the picker is serving.
  breadcrumb: string[];
  // description tells the user what selecting an endpoint will do.
  description?: string;
  // onSelect receives the chosen endpoint's name.
  onSelect: (endpointName: string) => void;
}

// EndpointPicker fetches a harness's endpoints and renders them as a navigable
// table — the endpoint counterpart of HarnessPicker, shared by every "pick an
// endpoint" screen (list, update, delete). Esc pops back.
export function EndpointPicker({
  ctx,
  core,
  harnessId,
  breadcrumb,
  description,
  onSelect,
}: EndpointPickerProps) {
  const opts = coreOptsFromCtx(ctx);
  const { columns } = useWindowSize();
  const navigate = useNavigate();

  const list = useQuery({
    queryKey: ["harness-endpoints", opts.region, harnessId],
    queryFn: () => core.harness.listHarnessEndpoints(harnessId, undefined, undefined, opts),
  });

  return (
    <Layout
      breadcrumb={breadcrumb}
      description={description}
      keyHints={[
        { key: "↑↓/jk", label: "navigate" },
        { key: "/", label: "filter" },
        { key: "enter", label: "select" },
        { key: "esc", label: "back" },
        { key: "ctl+c", label: "quit" },
      ]}
    >
      {list.isPending ? (
        <Spinner label="Loading endpoints…" />
      ) : list.isError ? (
        <Text color="red">Error: {(list.error as Error).message}</Text>
      ) : (list.data.endpoints ?? []).length === 0 ? (
        <Text>This harness has no endpoints yet.</Text>
      ) : (
        <DataTable
          borderStyle="none"
          borderTop={false}
          borderBottom={false}
          borderRight={false}
          showFooter={false}
          showDivider={true}
          columns={[
            { key: "endpointName", header: "Name", width: columns - 72 },
            { key: "liveVersion", header: "Live", width: 8 },
            { key: "targetVersion", header: "Target", width: 8 },
            { key: "status", header: "Status", width: 20 },
            { key: "updatedAt", header: "UpdatedAt", width: 30 },
          ]}
          data={(list.data.endpoints ?? []).map(toRow)}
          onSelect={(row) => {
            if (row.endpointName) onSelect(row.endpointName);
          }}
          onEscape={() => navigate(-1)}
        />
      )}
    </Layout>
  );
}

import { Text, useWindowSize } from "ink";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type { HarnessVersionSummary } from "@aws-sdk/client-bedrock-agentcore-control";
import { DataTable } from "./ui/data-table";
import type { ScreenProps } from "../handlers/types";
import { coreOptsFromCtx } from "../handlers/utils";
import { Spinner } from "./ui/spinner";
import { Layout } from "./Layout";

// VersionRow is the flat, display-ready shape the table renders.
interface VersionRow extends Record<string, unknown> {
  harnessVersion: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function toRow(v: HarnessVersionSummary): VersionRow {
  return {
    harnessVersion: v.harnessVersion!,
    status: v.status!,
    createdAt: v.createdAt!.toISOString(),
    updatedAt: v.updatedAt!.toISOString(),
  };
}

export interface VersionPickerProps extends ScreenProps {
  // harnessId scopes the listing to one harness's versions.
  harnessId: string;
  // breadcrumb labels the screen the picker is serving.
  breadcrumb: string[];
  // description tells the user what selecting a version will do.
  description?: string;
  // onSelect receives the chosen version (e.g. "2").
  onSelect: (version: string) => void;
}

// VersionPicker fetches a harness's versions and renders them as a navigable
// table, newest first. Esc pops back.
export function VersionPicker({
  ctx,
  core,
  harnessId,
  breadcrumb,
  description,
  onSelect,
}: VersionPickerProps) {
  const opts = coreOptsFromCtx(ctx);
  const { columns } = useWindowSize();
  const navigate = useNavigate();

  const list = useQuery({
    queryKey: ["harness-versions", opts.region, harnessId],
    queryFn: () => core.harness.listHarnessVersions(harnessId, undefined, undefined, opts),
  });

  // Newest first: versions are numeric strings incremented by UpdateHarness.
  const rows = (list.data?.harnessVersions ?? [])
    .map(toRow)
    .sort((a, b) => Number(b.harnessVersion) - Number(a.harnessVersion));

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
        <Spinner label="Loading versions…" />
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
            { key: "harnessVersion", header: "Version", width: 10 },
            { key: "status", header: "Status", width: 20 },
            { key: "createdAt", header: "CreatedAt", width: 30 },
            { key: "updatedAt", header: "UpdatedAt", width: 30 },
          ]}
          data={rows}
          onSelect={(row) => {
            if (row.harnessVersion) onSelect(row.harnessVersion);
          }}
          onEscape={() => navigate(-1)}
        />
      )}
    </Layout>
  );
}

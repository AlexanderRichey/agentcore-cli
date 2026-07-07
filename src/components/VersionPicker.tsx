import { Text } from "ink";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type { HarnessVersionSummary } from "@aws-sdk/client-bedrock-agentcore-control";
import { DataTable } from "./ui/data-table";
import type { ScreenProps } from "../handlers/types";
import { coreOptsFromCtx } from "../handlers/utils";
import { usePagedList } from "./usePagedList";
import { Spinner } from "./ui/spinner";
import { Layout } from "./Layout";
import { darkTheme } from "./ui/_core.js";

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
  const navigate = useNavigate();
  const paging = usePagedList();

  const list = useQuery({
    queryKey: ["harness-versions", opts.region, harnessId, paging.pageSize, paging.token],
    queryFn: () => core.harness.listHarnessVersions(harnessId, paging.token, paging.pageSize, opts),
    placeholderData: keepPreviousData,
  });

  const nextToken = list.data?.nextToken;
  // Pagination surfaces only once a response reports more pages (nextToken).
  const paginated = paging.pageIndex > 0 || nextToken !== undefined;

  // Newest first within the page: versions are numeric strings incremented by
  // UpdateHarness (the service already pages newest-first).
  const rows = (list.data?.harnessVersions ?? [])
    .map(toRow)
    .sort((a, b) => Number(b.harnessVersion) - Number(a.harnessVersion));

  return (
    <Layout
      breadcrumb={breadcrumb}
      description={description}
      keyHints={[
        { key: "↑↓/jk", label: "navigate" },
        ...(paginated ? [{ key: "←→/hl", label: "page" }] : []),
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
        <>
          <DataTable
            borderStyle="none"
            borderTop={false}
            borderBottom={false}
            borderRight={false}
            showFooter={false}
            showDivider={true}
            pageSize={paging.pageSize}
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
            onPrevPage={paging.pageIndex > 0 ? paging.prev : undefined}
            onNextPage={nextToken ? () => paging.next(nextToken) : undefined}
          />
          {paginated && (
            <Text color={darkTheme.colors.muted} dimColor>
              page {paging.pageIndex + 1}
              {nextToken ? " · more →" : ""}
            </Text>
          )}
        </>
      )}
    </Layout>
  );
}

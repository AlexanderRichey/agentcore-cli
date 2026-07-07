import { Text, useWindowSize } from "ink";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type { HarnessEndpoint } from "@aws-sdk/client-bedrock-agentcore-control";
import { DataTable } from "./ui/data-table";
import type { ScreenProps } from "../handlers/types";
import { coreOptsFromCtx } from "../handlers/utils";
import { usePagedList } from "./usePagedList";
import { Spinner } from "./ui/spinner";
import { Layout } from "./Layout";
import { darkTheme } from "./ui/_core.js";

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
  // onEscape overrides what esc does (default: pop back in history). Hosts
  // that embed the picker as an overlay (e.g. the chat's ctrl+t endpoint
  // switch) pass a closer instead.
  onEscape?: () => void;
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
  onEscape,
}: EndpointPickerProps) {
  const opts = coreOptsFromCtx(ctx);
  const { columns } = useWindowSize();
  const navigate = useNavigate();
  const paging = usePagedList();

  const list = useQuery({
    queryKey: ["harness-endpoints", opts.region, harnessId, paging.pageSize, paging.token],
    queryFn: () =>
      core.harness.listHarnessEndpoints(harnessId, paging.token, paging.pageSize, opts),
    placeholderData: keepPreviousData,
  });

  const nextToken = list.data?.nextToken;
  // Pagination surfaces only once a response reports more pages (nextToken).
  const paginated = paging.pageIndex > 0 || nextToken !== undefined;

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
        <Spinner label="Loading endpoints…" />
      ) : list.isError ? (
        <Text color="red">Error: {(list.error as Error).message}</Text>
      ) : !paginated && (list.data.endpoints ?? []).length === 0 ? (
        <Text>This harness has no endpoints yet.</Text>
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
            onEscape={onEscape ?? (() => navigate(-1))}
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

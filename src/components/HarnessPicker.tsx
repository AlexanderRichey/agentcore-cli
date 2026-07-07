import { Text, useWindowSize } from "ink";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type { HarnessSummary } from "@aws-sdk/client-bedrock-agentcore-control";
import { DataTable } from "./ui/data-table";
import type { ScreenProps } from "../handlers/types";
import { coreOptsFromCtx } from "../handlers/utils";
import { usePagedList } from "./usePagedList";
import { Spinner } from "./ui/spinner";
import { Layout } from "./Layout";
import { darkTheme } from "./ui/_core.js";

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

// toRow flattens a HarnessSummary into a HarnessRow, formatting dates.
function toRow(h: HarnessSummary): HarnessRow {
  return {
    harnessId: h.harnessId!,
    harnessName: h.harnessName!,
    updatedAt: h.updatedAt!.toISOString(),
    harnessVersion: h.harnessVersion!,
    status: h.status!,
  };
}

export interface HarnessPickerProps extends ScreenProps {
  // breadcrumb labels the screen the picker is serving (e.g. [..., "list"]).
  breadcrumb: string[];
  // description is the optional subtitle shown after the breadcrumb, telling the
  // user what selecting a harness will do (e.g. "choose a harness to chat with").
  description?: string;
  // onSelect receives the chosen harness's id; the host screen decides where
  // selection leads.
  onSelect: (harnessId: string) => void;
}

// HarnessPicker fetches the caller's harnesses and renders them as a navigable
// table. It is the shared body of every "pick a harness" screen (list, invoke);
// hosts differ only in breadcrumb, subtitle, and what selection does. Esc
// returns to the parent menu, derived from the breadcrumb (e.g. the endpoint
// menu for [..., "endpoint", "list"]).
export function HarnessPicker({
  ctx,
  core,
  breadcrumb,
  description,
  onSelect,
}: HarnessPickerProps) {
  const opts = coreOptsFromCtx(ctx);
  const { columns } = useWindowSize();
  const navigate = useNavigate();
  const paging = usePagedList();

  const list = useQuery({
    queryKey: ["harnesses", opts.region, paging.pageSize, paging.token],
    queryFn: () => core.harness.listHarnesses(paging.token, paging.pageSize, opts),
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
        <Spinner label="Loading harnesses…" />
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
              { key: "harnessName", header: "Name", width: columns - 62 },
              { key: "updatedAt", header: "UpdatedAt", width: 30 },
              { key: "harnessVersion", header: "Version", width: 10 },
              { key: "status", header: "Status", width: 20 },
            ]}
            data={(list.data.harnesses ?? []).map(toRow)}
            onSelect={(row) => {
              if (row.harnessId) onSelect(row.harnessId);
            }}
            onEscape={() => navigate("/" + breadcrumb.slice(0, -1).join("/"))}
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

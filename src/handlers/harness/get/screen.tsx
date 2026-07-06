import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type DataTableColumn } from "@inkui-cli/data-table";
import type { HarnessSummary } from "@aws-sdk/client-bedrock-agentcore-control";
import type { ScreenProps } from "../../types";
import { coreOptsFromCtx } from "../../utils";

// HarnessRow is the flat, display-ready shape the table renders. It also satisfies
// DataTable's `T extends Record<string, unknown>` constraint, which the SDK's
// HarnessSummary interface does not.
interface HarnessRow extends Record<string, unknown> {
  harnessId: string;
  updatedAt: string;
  harnessVersion: string;
  status: string;
}

// columns defines the harness list table's columns.
function columns(): DataTableColumn<HarnessRow>[] {
  return [
    { key: "harnessId", header: "ID" },
    { key: "updatedAt", header: "UpdatedAt" },
    { key: "harnessVersion", header: "Version" },
    { key: "status", header: "Status" },
  ];
}

// toRow flattens a HarnessSummary into a HarnessRow, formatting dates and filling
// the SDK's optional fields with a placeholder.
function toRow(h: HarnessSummary): HarnessRow {
  return {
    harnessId: h.harnessId ?? "—",
    updatedAt: h.updatedAt instanceof Date ? h.updatedAt.toISOString() : "—",
    harnessVersion: h.harnessVersion ?? "—",
    status: h.status ?? "—",
  };
}

// HarnessGetScreen lists the caller's harnesses in a table; selecting one fetches
// its full definition (detail rendering is still a TODO). Esc returns to the table.
export function HarnessGetScreen({ ctx, core }: ScreenProps) {
  const opts = coreOptsFromCtx(ctx);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const list = useQuery({
    queryKey: ["harnesses", opts.region],
    queryFn: () => core.harness.listHarnesses(undefined, undefined, opts),
  });

  const detail = useQuery({
    queryKey: ["harness", opts.region, selectedId],
    queryFn: () => core.harness.getHarness(selectedId!, opts),
    enabled: selectedId !== undefined,
  });

  // Esc pops back from the detail view to the table.
  useInput(
    (_input, key) => {
      if (key.escape) {
        setSelectedId(undefined);
      }
    },
    { isActive: selectedId !== undefined },
  );

  if (selectedId !== undefined) {
    return (
      <Box flexDirection="column">
        <Box>
          {detail.isPending ? (
            <Text>Loading harness…</Text>
          ) : detail.isError ? (
            <Text color="red">Error: {(detail.error as Error).message}</Text>
          ) : (
            <Text>TODO: render harness detail for {selectedId}</Text>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box>
        {list.isPending ? (
          <Text>Loading harnesses…</Text>
        ) : list.isError ? (
          <Text color="red">Error: {(list.error as Error).message}</Text>
        ) : (
          <DataTable
            borderStyle="rounded"
            showFooter={false}
            columns={columns()}
            data={(list.data.harnesses ?? []).map(toRow)}
            onSelect={(row) => {
              if (row.harnessId !== "—") setSelectedId(row.harnessId);
            }}
          />
        )}
      </Box>
    </Box>
  );
}

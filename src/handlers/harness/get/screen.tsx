import { useRef, useState } from "react";
import { Box, Text, useInput, useWindowSize } from "ink";
import { useQuery } from "@tanstack/react-query";
import type { HarnessSummary } from "@aws-sdk/client-bedrock-agentcore-control";
import { ScrollView, type ScrollViewRef } from "ink-scroll-view";
import { DataTable } from "../../../components/ui/data-table";
import type { ScreenProps } from "../../types";
import { coreOptsFromCtx } from "../../utils";
import { Spinner } from "../../../components/ui/spinner";
import { Divider } from "../../../components/ui/divider";
import { KeyHint } from "../../../components/ui/key-hint";
import { CodeBlock } from "../../../components/ui/code-block";

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

// HarnessGetScreen lists the caller's harnesses in a table; selecting one fetches
// its full definition (detail rendering is still a TODO). Esc returns to the table.
export function HarnessGetScreen({ ctx, core }: ScreenProps) {
  const opts = coreOptsFromCtx(ctx);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const { columns, rows } = useWindowSize();

  const list = useQuery({
    queryKey: ["harnesses", opts.region],
    queryFn: () => core.harness.listHarnesses(undefined, undefined, opts),
  });

  const detail = useQuery({
    queryKey: ["harness", opts.region, selectedId],
    queryFn: () => core.harness.getHarness(selectedId!, opts),
    enabled: selectedId !== undefined,
  });

  const scrollRef = useRef<ScrollViewRef>(null);

  // Esc pops back from the detail view to the table.
  useInput(
    (input, key) => {
      if (key.escape) {
        setSelectedId(undefined);
      }
      if (key.upArrow || input === "k") {
        scrollRef.current?.scrollBy(-1); // Scroll up 1 line
      }
      if (key.downArrow || input === "j") {
        scrollRef.current?.scrollBy(1); // Scroll down 1 line
      }
    },
    { isActive: selectedId !== undefined },
  );

  if (selectedId !== undefined) {
    return (
      <Box width={columns} height={rows} flexDirection="column" justifyContent="space-between">
        <Box flexDirection="column">
          <Box paddingLeft={1} paddingRight={1}>
            <Text>
              <Text bold>agentcore</Text> → harness → get → {selectedId}
            </Text>
          </Box>
          <Divider />
        </Box>

        <Box height={rows - 4} flexDirection="column" paddingX={1}>
          {detail.isPending ? (
            <Spinner label="Loading harness…" />
          ) : detail.isError ? (
            <Text color="red">Error: {(detail.error as Error).message}</Text>
          ) : (
            <ScrollView ref={scrollRef}>
              <CodeBlock
                language="json"
                showLineNumbers={false}
                showBorder={false}
                code={JSON.stringify(detail.data.harness, null, 2)}
              />
            </ScrollView>
          )}
        </Box>

        <Box flexDirection="column">
          <Divider />
          <KeyHint
            keys={[
              { key: "↑↓/jk", label: "navigate" },
              { key: "esc", label: "back" },
              { key: "ctl+c", label: "quit" },
            ]}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box width={columns} height={rows} flexDirection="column" justifyContent="space-between">
      <Box flexDirection="column">
        <Box paddingLeft={1} paddingRight={1}>
          <Text>
            <Text bold>agentcore</Text> → harness → get
          </Text>
        </Box>
        <Divider />

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
              if (row.harnessId !== "—") setSelectedId(row.harnessId);
            }}
          />
        )}
      </Box>
      <Box flexDirection="column">
        <Divider />
        <KeyHint
          keys={[
            { key: "↑↓/jk", label: "navigate" },
            { key: "/", label: "filter" },
            { key: "enter", label: "select" },
            { key: "ctl+c", label: "quit" },
          ]}
        />
      </Box>
    </Box>
  );
}

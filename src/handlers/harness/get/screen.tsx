import { useRef } from "react";
import { Box, Text, useInput, useWindowSize } from "ink";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { ScrollView, type ScrollViewRef } from "ink-scroll-view";
import type { ScreenProps } from "../../types";
import { coreOptsFromCtx } from "../../utils";
import { Spinner } from "../../../components/ui/spinner";
import { Divider } from "../../../components/ui/divider";
import { KeyHint } from "../../../components/ui/key-hint";
import { CodeBlock } from "../../../components/ui/code-block";

// HarnessGetScreen fetches a single harness's full definition and renders it as a
// scrollable JSON block. The harness ID comes from the `:harnessId` route path
// value. Esc pops back to wherever the user came from (the list).
export function HarnessGetScreen({ ctx, core }: ScreenProps) {
  const opts = coreOptsFromCtx(ctx);
  const { columns, rows } = useWindowSize();
  const navigate = useNavigate();
  const { harnessId } = useParams();

  const detail = useQuery({
    queryKey: ["harness", opts.region, harnessId],
    queryFn: () => core.harness.getHarness(harnessId!, opts),
    enabled: harnessId !== undefined,
  });

  const scrollRef = useRef<ScrollViewRef>(null);

  // Esc pops back from the detail view; jk/arrows scroll the JSON block.
  useInput((input, key) => {
    if (key.escape) {
      navigate(-1);
    }
    if (key.upArrow || input === "k") {
      scrollRef.current?.scrollBy(-1); // Scroll up 1 line
    }
    if (key.downArrow || input === "j") {
      scrollRef.current?.scrollBy(1); // Scroll down 1 line
    }
  });

  return (
    <Box width={columns} height={rows} flexDirection="column" justifyContent="space-between">
      <Box flexDirection="column">
        <Box paddingLeft={1} paddingRight={1}>
          <Text>
            <Text bold>agentcore</Text> → harness → get → {harnessId}
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

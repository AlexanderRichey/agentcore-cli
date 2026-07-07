import { useEffect, useRef, useState } from "react";
import { Box, Text, useInput, useWindowSize } from "ink";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { ScrollView, type ScrollViewRef } from "ink-scroll-view";
import type { ScreenProps } from "../../types";
import { coreOptsFromCtx } from "../../utils";
import { HarnessPicker } from "../HarnessPicker";
import { Layout } from "../../../components/Layout";
import { Divider } from "../../../components/ui/divider";
import { Markdown } from "../../../components/ui/markdown";
import { Spinner } from "../../../components/ui/spinner";
import { StatusIndicator, type StatusValue } from "../../../components/ui/status-indicator";
import { TextInput } from "../../../components/ui/text-input";
import { darkTheme } from "../../../components/ui/_core.js";
import {
  applyEvent,
  finishTurn,
  newSessionId,
  newTurn,
  turnSummary,
  type TranscriptItem,
  type Turn,
} from "./transcript";

const theme = darkTheme;

// HarnessInvokeScreen is the interactive chat for `harness invoke`. Without a
// `:harnessId` route value it renders a picker (choose which harness to chat
// with); with one it renders the chat itself.
export function HarnessInvokeScreen(props: ScreenProps) {
  const { harnessId } = useParams();
  const navigate = useNavigate();

  if (!harnessId) {
    return (
      <HarnessPicker
        {...props}
        breadcrumb={["agentcore", "harness", "invoke"]}
        description="choose a harness to chat with"
        onSelect={(id) => navigate(`/agentcore/harness/invoke/${id}`)}
      />
    );
  }
  return <InvokeChat {...props} harnessId={harnessId} />;
}

// ─── chat ─────────────────────────────────────────────────────────────────────

// InvokeChat is the conversation view: a scrollable transcript, a one-row status
// line, and the prompt pinned at the bottom. One runtime session spans the whole
// chat — the service keeps conversation state server-side, so each send carries
// only the new user message.
function InvokeChat({ ctx, core, harnessId }: ScreenProps & { harnessId: string }) {
  const opts = coreOptsFromCtx(ctx);
  const { columns, rows } = useWindowSize();
  const navigate = useNavigate();

  const detail = useQuery({
    queryKey: ["harness", opts.region, harnessId],
    queryFn: () => core.harness.getHarness(harnessId, opts),
  });

  const [sessionId] = useState(newSessionId);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [items, setItems] = useState<TranscriptItem[]>([]);

  // The stream loop is async and outlives any single render, so everything it
  // touches lives in refs: it must append to the *latest* transcript (not a
  // stale closure's copy) and stop mutating state after unmount.
  const historyRef = useRef<TranscriptItem[]>([]);
  const turnRef = useRef<Turn | null>(null);
  const streamingRef = useRef(false);
  const aliveRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollViewRef>(null);
  // stick keeps the view pinned to the newest output; scrolling up releases it,
  // returning to the bottom (or sending) re-engages it.
  const stickRef = useRef(true);

  useEffect(() => {
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (stickRef.current) scrollRef.current?.scrollToBottom();
  }, [items]);

  // sync publishes the ref-held transcript (settled history + the in-flight
  // turn) into React state so Ink re-renders.
  const sync = () => {
    if (!aliveRef.current) return;
    setItems([...historyRef.current, ...(turnRef.current?.items ?? [])]);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    const arn = detail.data?.harness?.arn;
    if (trimmed === "" || streamingRef.current || !arn) return;

    setInput("");
    stickRef.current = true;
    historyRef.current.push({ kind: "user", text: trimmed });
    const turn = newTurn();
    turnRef.current = turn;
    streamingRef.current = true;
    setStreaming(true);
    sync();

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await core.harness.invokeHarness(
        {
          harnessArn: arn,
          runtimeSessionId: sessionId,
          messages: [{ role: "user", content: [{ text: trimmed }] }],
        },
        opts,
        controller.signal,
      );
      for await (const event of response.stream ?? []) {
        if (!aliveRef.current) return;
        applyEvent(turn, event);
        sync();
      }
      finishTurn(turn);
      turn.items.push({ kind: "notice", text: turnSummary(turn) });
    } catch (error) {
      finishTurn(turn);
      if (controller.signal.aborted || (error as Error)?.name === "AbortError") {
        turn.items.push({ kind: "notice", text: "interrupted" });
      } else {
        turn.items.push({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      historyRef.current.push(...turn.items);
      turnRef.current = null;
      abortRef.current = null;
      streamingRef.current = false;
      if (aliveRef.current) {
        setStreaming(false);
        sync();
      }
    }
  };

  // Esc interrupts a running turn or pops back when idle; arrows scroll the
  // transcript. Text editing and enter-to-send belong to the TextInput below —
  // the two handlers own disjoint keys.
  useInput((_input, key) => {
    if (key.escape) {
      if (streamingRef.current) abortRef.current?.abort();
      else navigate(-1);
      return;
    }
    const view = scrollRef.current;
    if (!view) return;
    if (key.upArrow) {
      const offset = view.getScrollOffset();
      view.scrollBy(-1);
      if (offset - 1 < view.getBottomOffset()) stickRef.current = false;
    }
    if (key.downArrow) {
      const offset = view.getScrollOffset();
      view.scrollBy(1);
      if (offset + 1 >= view.getBottomOffset()) stickRef.current = true;
    }
  });

  return (
    <Layout
      breadcrumb={["agentcore", "harness", "invoke", harnessId]}
      keyHints={
        streaming
          ? [
              { key: "esc", label: "interrupt" },
              { key: "ctl+c", label: "quit" },
            ]
          : [
              { key: "enter", label: "send" },
              { key: "↑↓", label: "scroll" },
              { key: "esc", label: "back" },
              { key: "ctl+c", label: "quit" },
            ]
      }
    >
      {detail.isPending ? (
        <Spinner label="Loading harness…" />
      ) : detail.isError ? (
        <Text color="red">Error: {(detail.error as Error).message}</Text>
      ) : (
        <Box flexDirection="column">
          <Box height={rows - 7} flexDirection="column">
            <ScrollView ref={scrollRef}>
              {items.map((item, i) => (
                <ItemView key={i} item={item} width={columns} />
              ))}
            </ScrollView>
          </Box>
          <Divider />
          <Box height={1} paddingX={1}>
            {streaming ? (
              <Spinner label="Working… (esc to interrupt)" />
            ) : (
              <Text color={theme.colors.muted}>session {sessionId.slice(0, 8)}</Text>
            )}
          </Box>
          <Box paddingX={1}>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={(value) => void send(value)}
              placeholder="Send a message…"
            />
          </Box>
        </Box>
      )}
    </Layout>
  );
}

// ─── transcript rendering ─────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// resultPreview reduces a tool result to its first line plus a line count, so a
// large payload never floods the transcript.
function resultPreview(result: string): string {
  const lines = result.trimEnd().split("\n");
  const first = truncate(lines[0] ?? "", 80);
  return lines.length > 1 ? `${first} … (+${lines.length - 1} lines)` : first;
}

const TOOL_STATUS: Record<string, StatusValue> = {
  running: "loading",
  success: "online",
  error: "error",
};

// ItemView renders one transcript item in its Claude Code-style shape: `❯` user
// lines, `⏺` assistant text (Markdown once settled), `✻` reasoning, a
// StatusIndicator per tool call with a result preview, and red `✗` errors.
function ItemView({ item, width }: { item: TranscriptItem; width: number }) {
  switch (item.kind) {
    case "user":
      return <Text color={theme.colors.muted}>❯ {item.text}</Text>;
    case "text":
      if (item.streaming) {
        return (
          <Text>
            ⏺ {item.text}
            <Text color={theme.colors.muted}>▌</Text>
          </Text>
        );
      }
      return (
        <Box>
          <Text>⏺ </Text>
          <Box width={width - 4}>
            <Markdown content={item.text} width={width - 4} />
          </Box>
        </Box>
      );
    case "reasoning":
      return (
        <Text color={theme.colors.muted} italic>
          ✻ {item.text}
          {item.streaming ? "▌" : ""}
        </Text>
      );
    case "tool": {
      const label = `${item.serverName ? `${item.serverName}:` : ""}${item.name}(${truncate(item.input, 60)})`;
      return (
        <Box flexDirection="column">
          <StatusIndicator status={TOOL_STATUS[item.status]!} label={label} />
          {item.result !== "" ? (
            <Text color={item.status === "error" ? theme.colors.error : theme.colors.muted}>
              {"  └ "}
              {resultPreview(item.result)}
            </Text>
          ) : null}
        </Box>
      );
    }
    case "error":
      return <Text color={theme.colors.error}>✗ {item.message}</Text>;
    case "notice":
      return <Text color={theme.colors.muted}>{item.text}</Text>;
  }
}

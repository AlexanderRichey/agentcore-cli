import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useNavigate } from "react-router";
import { Layout } from "./Layout";
import { Spinner } from "./ui/spinner";
import { Confirm } from "./ui/confirm";
import { darkTheme } from "./ui/_core.js";

const theme = darkTheme;

export interface SummaryRow {
  label: string;
  value: string;
}

export interface ConfirmActionProps {
  // breadcrumb labels the screen.
  breadcrumb: string[];
  // title heads the summary overlay (usually the resource name).
  title: string;
  // rows describe the resource the action applies to.
  rows: SummaryRow[];
  // message is the yes/no question (destructive actions default to No).
  message: string;
  // isPending / error reflect the summary fetch backing the overlay.
  isPending: boolean;
  error: Error | null;
  // action performs the confirmed operation and resolves to result rows shown
  // on the success panel.
  action: () => Promise<SummaryRow[]>;
  // successTitle heads the success panel (e.g. "Harness deleted").
  successTitle: string;
  // runningLabel is the spinner label while the action runs.
  runningLabel: string;
  // onDone is called when the user acknowledges the success panel.
  onDone: () => void;
}

type Phase =
  | { kind: "confirm" }
  | { kind: "running" }
  | { kind: "success"; rows: SummaryRow[] }
  | { kind: "error"; message: string };

// ConfirmAction is the shared destructive-action screen body: a summary overlay
// of the target resource, a y/N confirmation (defaulting to No), a spinner
// while the action runs, and a success/error panel. Cancel and esc pop back.
export function ConfirmAction({
  breadcrumb,
  title,
  rows,
  message,
  isPending,
  error,
  action,
  successTitle,
  runningLabel,
  onDone,
}: ConfirmActionProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>({ kind: "confirm" });

  const run = async () => {
    setPhase({ kind: "running" });
    try {
      setPhase({ kind: "success", rows: await action() });
    } catch (err) {
      setPhase({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  };

  const hints =
    phase.kind === "confirm"
      ? [
          { key: "y/n", label: "confirm" },
          { key: "esc", label: "back" },
          { key: "ctl+c", label: "quit" },
        ]
      : phase.kind === "success"
        ? [{ key: "enter", label: "continue" }]
        : [
            { key: "esc", label: "back" },
            { key: "ctl+c", label: "quit" },
          ];

  return (
    <Layout breadcrumb={breadcrumb} keyHints={hints}>
      {isPending ? (
        <Spinner label="Loading…" />
      ) : error ? (
        <ErrorBody message={error.message} onBack={() => navigate(-1)} />
      ) : (
        <Box flexDirection="column" paddingX={1}>
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.colors.border}
            paddingX={1}
            marginBottom={1}
          >
            <Text bold>{title}</Text>
            {rows.map((row) => (
              <Text key={row.label}>
                <Text color={theme.colors.muted}>{row.label.padEnd(8)}</Text>
                {row.value}
              </Text>
            ))}
          </Box>

          {phase.kind === "confirm" && (
            <Confirm
              message={message}
              defaultValue={false}
              onConfirm={run}
              onCancel={() => navigate(-1)}
            />
          )}
          {phase.kind === "running" && <Spinner label={runningLabel} />}
          {phase.kind === "success" && (
            <SuccessBody title={successTitle} rows={phase.rows} onDone={onDone} />
          )}
          {phase.kind === "error" && (
            <ErrorBody message={phase.message} onBack={() => setPhase({ kind: "confirm" })} />
          )}
        </Box>
      )}
    </Layout>
  );
}

function SuccessBody({
  title,
  rows,
  onDone,
}: {
  title: string;
  rows: SummaryRow[];
  onDone: () => void;
}) {
  useInput((_input, key) => {
    if (key.return || key.escape) onDone();
  });

  return (
    <Box flexDirection="column">
      <Text color={theme.colors.success} bold>
        ✔ {title}
      </Text>
      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        {rows.map((row) => (
          <Text key={row.label}>
            <Text color={theme.colors.muted}>{row.label.padEnd(8)}</Text>
            {row.value}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={theme.colors.muted}>
          press <Text color={theme.colors.focus}>enter</Text> to continue
        </Text>
      </Box>
    </Box>
  );
}

function ErrorBody({ message, onBack }: { message: string; onBack: () => void }) {
  useInput((_input, key) => {
    if (key.escape || key.return) onBack();
  });

  return (
    <Box flexDirection="column">
      <Text color={theme.colors.error}>✗ {message}</Text>
      <Box marginTop={1}>
        <Text color={theme.colors.muted}>press esc to go back</Text>
      </Box>
    </Box>
  );
}

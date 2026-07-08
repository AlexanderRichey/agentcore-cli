import { Box, Text } from "ink";

import { darkTheme } from "./ui/_core.js";

const theme = darkTheme;

export interface KeyValueTableProps {
  items: Record<string, string>;
}

export function KeyValueTable({ items }: KeyValueTableProps) {
  const longestKeyLen = Object.keys(items).reduce((prev, cur) => {
    if (cur.length > prev) {
      return cur.length;
    } else {
      return prev;
    }
  }, 0);

  const columnWidth = longestKeyLen + 2;

  return (
    <Box flexDirection="column">
      {Object.entries(items).map(([key, value]) => (
        <Text color={theme.colors.text}>
          <Text color={theme.colors.muted}>{key.padEnd(columnWidth)}</Text>
          {value}
        </Text>
      ))}
    </Box>
  );
}

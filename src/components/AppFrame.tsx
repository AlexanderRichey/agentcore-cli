import type { ReactNode } from "react";
import { Box, useWindowSize } from "ink";

export interface AppFrameProps {
  children: ReactNode;
}

// AppFrame is the outer chrome of the TUI. It sizes itself to the full terminal so
// the app takes over the screen (paired with the alternate screen buffer enabled
// in renderTui, this is the Vim-style full-screen takeover). All routed screens
// render inside it.
export function AppFrame({ children }: AppFrameProps) {
  const { columns, rows } = useWindowSize();

  return (
    <Box width={columns} height={rows} flexDirection="column">
      {children}
    </Box>
  );
}

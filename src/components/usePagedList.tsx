import { useEffect, useState } from "react";
import { useWindowSize } from "ink";

// CHROME_ROWS is everything a picker screen renders around the table rows:
// the Layout header and footer (2 each), the DataTable filter line, the
// column-header row and its divider, and the pagination status line.
const CHROME_ROWS = 8;

export interface PagedList {
  // pageSize is how many table rows fit the terminal — sent as maxResults so
  // one response fills the table exactly.
  pageSize: number;
  // pageIndex is the zero-based page currently shown.
  pageIndex: number;
  // token is the nextToken that fetches the current page (undefined on page 1).
  token: string | undefined;
  // next advances a page; the caller passes the current response's nextToken.
  next: (nextToken: string | undefined) => void;
  // prev steps back a page (no-op on the first page).
  prev: () => void;
}

// usePagedList holds the server-side pagination state shared by the picker
// tables: a terminal-height-derived page size and the trail of nextTokens
// leading to the current page, so ←/h can walk back through cached pages.
export function usePagedList(): PagedList {
  const { rows } = useWindowSize();
  const pageSize = Math.max(3, rows - CHROME_ROWS);

  const [pageIndex, setPageIndex] = useState(0);
  // tokens[i] is the nextToken that fetched page i; page 0 has none.
  const [tokens, setTokens] = useState<(string | undefined)[]>([undefined]);

  // A resize changes maxResults, which invalidates the token trail (tokens
  // encode positions relative to the old page size) — restart from page 1.
  useEffect(() => {
    setPageIndex(0);
    setTokens([undefined]);
  }, [pageSize]);

  return {
    pageSize,
    pageIndex,
    token: tokens[pageIndex],
    next: (nextToken) => {
      if (!nextToken) return;
      setTokens((trail) => [...trail.slice(0, pageIndex + 1), nextToken]);
      setPageIndex((i) => i + 1);
    },
    prev: () => setPageIndex((i) => Math.max(0, i - 1)),
  };
}

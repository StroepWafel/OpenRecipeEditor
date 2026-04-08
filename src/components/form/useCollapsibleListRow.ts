import * as React from "react";

import { LIST_AUTO_COLLAPSE_THRESHOLD } from "./constants";

/** True when this row is in the “top” overflow (low indices) and should auto-collapse. */
function shouldAutoCollapseTopRow(rowIndex: number, siblingCount: number): boolean {
  if (siblingCount <= LIST_AUTO_COLLAPSE_THRESHOLD) return false;
  return rowIndex < siblingCount - LIST_AUTO_COLLAPSE_THRESHOLD;
}

type Args = {
  rowIndex: number;
  siblingCount: number;
  collapseAllSignal: number;
  expandAllSignal: number;
};

/**
 * Collapsible row: global collapse/expand-all, plus auto-collapse from the **top** of the
 * list (lowest indices first) when the list is long, keeping the last N rows expanded.
 * After the user toggles this row, auto rules no longer change its minimized state.
 */
export function useCollapsibleListRow({
  rowIndex,
  siblingCount,
  collapseAllSignal,
  expandAllSignal,
}: Args) {
  const rowTouchedRef = React.useRef(false);
  const lastCollapseRef = React.useRef(0);
  const lastExpandRef = React.useRef(0);

  const [minimized, setMinimized] = React.useState(() =>
    shouldAutoCollapseTopRow(rowIndex, siblingCount)
  );

  React.useEffect(() => {
    if (collapseAllSignal > lastCollapseRef.current) {
      lastCollapseRef.current = collapseAllSignal;
      setMinimized(true);
      return;
    }
    if (expandAllSignal > lastExpandRef.current) {
      lastExpandRef.current = expandAllSignal;
      setMinimized(false);
      return;
    }
    if (rowTouchedRef.current) return;
    setMinimized(shouldAutoCollapseTopRow(rowIndex, siblingCount));
  }, [collapseAllSignal, expandAllSignal, siblingCount, rowIndex]);

  const toggleRow = React.useCallback(() => {
    rowTouchedRef.current = true;
    setMinimized((m) => !m);
  }, []);

  return { minimized, toggleRow };
}

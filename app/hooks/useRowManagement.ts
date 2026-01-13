/**
 * Hook for managing sequencer rows
 */

import { useState, useCallback } from "react";
import type { RowType, RowConfig } from "@/types";
import { generateId } from "@/utils";

export type RowManagementReturn = {
  visibleRows: RowConfig[];
  setVisibleRows: (rows: RowConfig[]) => void;
  showAddRowMenu: boolean;
  setShowAddRowMenu: (v: boolean) => void;
  addRow: (type: RowType) => void;
  removeRow: (rowId: string) => void;
  moveRowUp: (rowId: string) => void;
  moveRowDown: (rowId: string) => void;
};

export function useRowManagement(): RowManagementReturn {
  const [visibleRows, setVisibleRows] = useState<RowConfig[]>([
    { id: generateId(), type: "direction" },
    { id: generateId(), type: "circles1Visible" },
    { id: generateId(), type: "circles2Visible" },
    { id: generateId(), type: "circles1Position" },
    { id: generateId(), type: "circles2Position" },
    { id: generateId(), type: "circlesGrowth" },
    { id: generateId(), type: "tilt3D" },
  ]);
  const [showAddRowMenu, setShowAddRowMenu] = useState(false);

  const addRow = useCallback(
    (type: RowType) => {
      setVisibleRows([...visibleRows, { id: generateId(), type }]);
      setShowAddRowMenu(false);
    },
    [visibleRows]
  );

  const removeRow = useCallback(
    (rowId: string) => {
      setVisibleRows(visibleRows.filter((r) => r.id !== rowId));
    },
    [visibleRows]
  );

  const moveRowUp = useCallback(
    (rowId: string) => {
      const idx = visibleRows.findIndex((r) => r.id === rowId);
      if (idx <= 0) return;
      const newRows = [...visibleRows];
      [newRows[idx - 1], newRows[idx]] = [newRows[idx], newRows[idx - 1]];
      setVisibleRows(newRows);
    },
    [visibleRows]
  );

  const moveRowDown = useCallback(
    (rowId: string) => {
      const idx = visibleRows.findIndex((r) => r.id === rowId);
      if (idx < 0 || idx >= visibleRows.length - 1) return;
      const newRows = [...visibleRows];
      [newRows[idx], newRows[idx + 1]] = [newRows[idx + 1], newRows[idx]];
      setVisibleRows(newRows);
    },
    [visibleRows]
  );

  return {
    visibleRows,
    setVisibleRows,
    showAddRowMenu,
    setShowAddRowMenu,
    addRow,
    removeRow,
    moveRowUp,
    moveRowDown,
  };
}

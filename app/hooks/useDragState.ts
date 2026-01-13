/**
 * Hook for managing drag state on pattern cells
 */

import { useState, useCallback, useEffect } from "react";
import type { DragState } from "@/types";

export type DragStateReturn = {
  dragState: DragState;
  handleBooleanMouseDown: (
    row: string,
    index: number,
    pattern: boolean[],
    setPattern: (p: boolean[]) => void
  ) => void;
  handleBooleanMouseEnter: (
    row: string,
    index: number,
    pattern: boolean[],
    setPattern: (p: boolean[]) => void
  ) => void;
};

export function useDragState(): DragStateReturn {
  const [dragState, setDragState] = useState<DragState>(null);

  const handleBooleanMouseDown = useCallback(
    (
      row: string,
      index: number,
      pattern: boolean[],
      setPattern: (p: boolean[]) => void
    ) => {
      const newValue = !pattern[index];
      const newPattern = [...pattern];
      newPattern[index] = newValue;
      setPattern(newPattern);
      setDragState({ row, value: newValue });
    },
    []
  );

  const handleBooleanMouseEnter = useCallback(
    (
      row: string,
      index: number,
      pattern: boolean[],
      setPattern: (p: boolean[]) => void
    ) => {
      if (dragState && dragState.row === row) {
        const newPattern = [...pattern];
        newPattern[index] = dragState.value;
        setPattern(newPattern);
      }
    },
    [dragState]
  );

  // Clear drag state on mouse up
  useEffect(() => {
    const handleMouseUp = () => setDragState(null);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return {
    dragState,
    handleBooleanMouseDown,
    handleBooleanMouseEnter,
  };
}

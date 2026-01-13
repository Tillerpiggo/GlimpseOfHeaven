/**
 * Hook for managing panel layout and resizing
 */

import { useState, useRef, useEffect, useCallback } from "react";

export type PanelLayoutReturn = {
  // Panel sizes
  controlsPanelWidth: number;
  drumMachineHeight: number;
  arrangementHeight: number;
  // Panel visibility
  controlsVisible: boolean;
  setControlsVisible: (v: boolean) => void;
  drumMachineExpanded: boolean;
  setDrumMachineExpanded: (v: boolean) => void;
  arrangementExpanded: boolean;
  setArrangementExpanded: (v: boolean) => void;
  // Cell width for pattern cells
  cellWidth: number;
  setCellWidth: (v: number) => void;
  // Fullscreen
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  // Resize handling
  isResizing: "controls" | "drumMachine" | "arrangement" | null;
  handleResizeStart: (type: "controls" | "drumMachine" | "arrangement", e: React.MouseEvent) => void;
};

export function usePanelLayout(): PanelLayoutReturn {
  // Panel sizes
  const [controlsPanelWidth, setControlsPanelWidth] = useState(280);
  const [drumMachineHeight, setDrumMachineHeight] = useState(300);
  const [arrangementHeight, setArrangementHeight] = useState(150);

  // Panel visibility
  const [controlsVisible, setControlsVisible] = useState(true);
  const [drumMachineExpanded, setDrumMachineExpanded] = useState(true);
  const [arrangementExpanded, setArrangementExpanded] = useState(false);

  // Cell width for pattern cells
  const [cellWidth, setCellWidth] = useState(28);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Resize state
  const [isResizing, setIsResizing] = useState<"controls" | "drumMachine" | "arrangement" | null>(null);
  const resizeStartRef = useRef<{ pos: number; size: number }>({ pos: 0, size: 0 });

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleResizeStart = useCallback((
    type: "controls" | "drumMachine" | "arrangement",
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    setIsResizing(type);
    const currentSize =
      type === "controls"
        ? controlsPanelWidth
        : type === "drumMachine"
        ? drumMachineHeight
        : arrangementHeight;
    const pos = type === "controls" ? e.clientX : e.clientY;
    resizeStartRef.current = { pos, size: currentSize };
  }, [controlsPanelWidth, drumMachineHeight, arrangementHeight]);

  // Handle resize mouse events
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { pos: startPos, size: startSize } = resizeStartRef.current;
      if (isResizing === "controls") {
        const delta = e.clientX - startPos;
        setControlsPanelWidth(Math.max(200, Math.min(500, startSize + delta)));
      } else if (isResizing === "drumMachine") {
        const delta = startPos - e.clientY; // Inverted because dragging up should increase
        setDrumMachineHeight(Math.max(100, Math.min(600, startSize + delta)));
      } else if (isResizing === "arrangement") {
        const delta = startPos - e.clientY;
        setArrangementHeight(Math.max(80, Math.min(400, startSize + delta)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return {
    controlsPanelWidth,
    drumMachineHeight,
    arrangementHeight,
    controlsVisible,
    setControlsVisible,
    drumMachineExpanded,
    setDrumMachineExpanded,
    arrangementExpanded,
    setArrangementExpanded,
    cellWidth,
    setCellWidth,
    isFullscreen,
    toggleFullscreen,
    isResizing,
    handleResizeStart,
  };
}

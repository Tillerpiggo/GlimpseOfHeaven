/**
 * MIDI note grid component - the main piano roll editing area
 */

import { useRef, useCallback, useEffect, useMemo } from "react";
import type {
  MIDINote,
  MIDIDragState,
  MIDIEditorTool,
  MIDIEditorViewSettings,
  QuantizeValue,
} from "@/types";
import {
  TICKS_PER_BEAT,
  ticksToPixels,
  pixelsToTicks,
  noteToY,
  yToNote,
  getQuantizeTicks,
  quantizeTick,
  isBlackKey,
} from "@/utils";

export type MIDINoteGridProps = {
  notes: MIDINote[];
  viewSettings: MIDIEditorViewSettings;
  bars: number;
  ticksPerBeat: number;
  tool: MIDIEditorTool;
  dragState: MIDIDragState;
  selection: { noteIds: Set<string> };
  playheadTick?: number;
  onNoteClick: (noteId: string, e: React.MouseEvent) => void;
  onNoteDoubleClick: (noteId: string) => void;
  onNoteDelete: (noteId: string) => void;
  onGridClick: (tick: number, pitch: number, e: React.MouseEvent) => void;
  onGridDoubleClick: (tick: number, pitch: number) => void;
  onDragStart: (state: MIDIDragState) => void;
  onDragMove: (e: React.MouseEvent) => void;
  onDragEnd: () => void;
  onScroll: (x: number, y: number) => void;
  onDuplicateStart?: (noteId: string) => void;
  onSelectionBoxChange?: (box: { x1: number; y1: number; x2: number; y2: number } | null) => void;
};

const NOTE_COLORS = {
  default: "bg-cyan-500",
  selected: "bg-orange-500",
  velocity: {
    low: "bg-blue-600",
    medium: "bg-cyan-500",
    high: "bg-green-500",
  },
};

function getVelocityColor(velocity: number): string {
  if (velocity < 50) return NOTE_COLORS.velocity.low;
  if (velocity < 100) return NOTE_COLORS.velocity.medium;
  return NOTE_COLORS.velocity.high;
}

export function MIDINoteGrid({
  notes,
  viewSettings,
  bars,
  ticksPerBeat,
  tool,
  dragState,
  selection,
  playheadTick,
  onNoteClick,
  onNoteDoubleClick,
  onNoteDelete,
  onGridClick,
  onGridDoubleClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onScroll,
  onDuplicateStart,
  onSelectionBoxChange,
}: MIDINoteGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const {
    horizontalZoom,
    verticalZoom,
    scrollX,
    scrollY,
    quantize,
    showVelocity,
    noteRange,
  } = viewSettings;

  // Calculate grid dimensions
  const totalTicks = bars * 4 * ticksPerBeat;
  const gridWidth = ticksToPixels(totalTicks, horizontalZoom, ticksPerBeat);
  const gridHeight = (noteRange.high - noteRange.low + 1) * verticalZoom;

  // Calculate grid line positions
  const gridLines = useMemo(() => {
    const lines: { x: number; type: "bar" | "beat" | "sub" }[] = [];
    const ticksPerBar = ticksPerBeat * 4;
    const subGridTicks = getQuantizeTicks(quantize, ticksPerBeat);

    for (let tick = 0; tick <= totalTicks; tick += subGridTicks) {
      const x = ticksToPixels(tick, horizontalZoom, ticksPerBeat);
      if (tick % ticksPerBar === 0) {
        lines.push({ x, type: "bar" });
      } else if (tick % ticksPerBeat === 0) {
        lines.push({ x, type: "beat" });
      } else {
        lines.push({ x, type: "sub" });
      }
    }
    return lines;
  }, [totalTicks, ticksPerBeat, horizontalZoom, quantize]);

  // Handle mouse events for grid interaction
  const getGridPosition = useCallback(
    (e: React.MouseEvent) => {
      if (!gridRef.current) return null;
      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollX;
      const y = e.clientY - rect.top + scrollY;
      const tick = pixelsToTicks(x, horizontalZoom, ticksPerBeat);
      const pitch = yToNote(y, noteRange.high, verticalZoom);
      return { x, y, tick, pitch };
    },
    [scrollX, scrollY, horizontalZoom, ticksPerBeat, noteRange.high, verticalZoom]
  );

  // Track selection box for rendering
  const selectionBoxRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getGridPosition(e);
      if (!pos) return;

      // Right-click to delete
      if (e.button === 2) {
        const clickedNote = notes.find((note) => {
          const noteX = ticksToPixels(note.startTick, horizontalZoom, ticksPerBeat);
          const noteWidth = ticksToPixels(note.duration, horizontalZoom, ticksPerBeat);
          const noteY = noteToY(note.pitch, noteRange.high, verticalZoom);
          const noteHeight = verticalZoom;
          return (
            pos.x >= noteX &&
            pos.x <= noteX + noteWidth &&
            pos.y >= noteY &&
            pos.y <= noteY + noteHeight
          );
        });
        if (clickedNote) {
          onNoteDelete(clickedNote.id);
        }
        return;
      }

      // Check if clicking on a note
      const clickedNote = notes.find((note) => {
        const noteX = ticksToPixels(note.startTick, horizontalZoom, ticksPerBeat);
        const noteWidth = ticksToPixels(note.duration, horizontalZoom, ticksPerBeat);
        const noteY = noteToY(note.pitch, noteRange.high, verticalZoom);
        const noteHeight = verticalZoom;

        return (
          pos.x >= noteX &&
          pos.x <= noteX + noteWidth &&
          pos.y >= noteY &&
          pos.y <= noteY + noteHeight
        );
      });

      if (clickedNote) {
        const noteX = ticksToPixels(clickedNote.startTick, horizontalZoom, ticksPerBeat);
        const noteWidth = ticksToPixels(clickedNote.duration, horizontalZoom, ticksPerBeat);
        const resizeThreshold = Math.min(10, noteWidth / 4);

        // Option/Alt+click to duplicate
        if (e.altKey && onDuplicateStart) {
          onNoteClick(clickedNote.id, e);
          onDuplicateStart(clickedNote.id);
          onDragStart({
            type: "move",
            noteId: clickedNote.id,
            startX: pos.x,
            startY: pos.y,
            startTick: clickedNote.startTick,
            startPitch: clickedNote.pitch,
            originalNote: { ...clickedNote },
          });
          return;
        }

        // Check if resizing from start or end
        if (pos.x - noteX < resizeThreshold) {
          onDragStart({
            type: "resize-start",
            noteId: clickedNote.id,
            startX: pos.x,
            startY: pos.y,
            startTick: clickedNote.startTick,
            originalNote: { ...clickedNote },
          });
        } else if (noteX + noteWidth - pos.x < resizeThreshold) {
          onDragStart({
            type: "resize-end",
            noteId: clickedNote.id,
            startX: pos.x,
            startY: pos.y,
            startTick: clickedNote.startTick + clickedNote.duration,
            originalNote: { ...clickedNote },
          });
        } else {
          onNoteClick(clickedNote.id, e);
          onDragStart({
            type: "move",
            noteId: clickedNote.id,
            startX: pos.x,
            startY: pos.y,
            startTick: clickedNote.startTick,
            startPitch: clickedNote.pitch,
            originalNote: { ...clickedNote },
          });
        }
      } else {
        // Clicked on empty grid
        if (tool === "draw") {
          const quantizedTick = quantizeTick(pos.tick, quantize, ticksPerBeat);
          onGridClick(quantizedTick, pos.pitch, e);
          onDragStart({
            type: "draw",
            startX: pos.x,
            startY: pos.y,
            startTick: quantizedTick,
            startPitch: pos.pitch,
          });
        } else if (tool === "select") {
          // Initialize selection box
          selectionBoxRef.current = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
          onSelectionBoxChange?.(selectionBoxRef.current);
          onDragStart({
            type: "select",
            startX: pos.x,
            startY: pos.y,
          });
        }
      }
    },
    [
      getGridPosition,
      notes,
      horizontalZoom,
      ticksPerBeat,
      noteRange.high,
      verticalZoom,
      tool,
      quantize,
      onNoteClick,
      onNoteDelete,
      onGridClick,
      onDragStart,
      onDuplicateStart,
      onSelectionBoxChange,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragState) {
        onDragMove(e);

        // Update selection box if in select mode
        if (dragState.type === "select") {
          const pos = getGridPosition(e);
          if (pos && selectionBoxRef.current) {
            selectionBoxRef.current = {
              ...selectionBoxRef.current,
              x2: pos.x,
              y2: pos.y,
            };
            onSelectionBoxChange?.(selectionBoxRef.current);
          }
        }
      }
    },
    [dragState, onDragMove, getGridPosition, onSelectionBoxChange]
  );

  const handleMouseUp = useCallback(() => {
    if (dragState) {
      onDragEnd();
      // Clear selection box
      selectionBoxRef.current = null;
      onSelectionBoxChange?.(null);
    }
  }, [dragState, onDragEnd, onSelectionBoxChange]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = getGridPosition(e);
      if (!pos) return;

      // Check if double-clicking on a note
      const clickedNote = notes.find((note) => {
        const noteX = ticksToPixels(note.startTick, horizontalZoom, ticksPerBeat);
        const noteWidth = ticksToPixels(note.duration, horizontalZoom, ticksPerBeat);
        const noteY = noteToY(note.pitch, noteRange.high, verticalZoom);
        const noteHeight = verticalZoom;

        return (
          pos.x >= noteX &&
          pos.x <= noteX + noteWidth &&
          pos.y >= noteY &&
          pos.y <= noteY + noteHeight
        );
      });

      if (clickedNote) {
        onNoteDoubleClick(clickedNote.id);
      } else {
        const quantizedTick = quantizeTick(pos.tick, quantize, ticksPerBeat);
        onGridDoubleClick(quantizedTick, pos.pitch);
      }
    },
    [
      getGridPosition,
      notes,
      horizontalZoom,
      ticksPerBeat,
      noteRange.high,
      verticalZoom,
      quantize,
      onNoteDoubleClick,
      onGridDoubleClick,
    ]
  );

  // Handle wheel for scrolling
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const newScrollX = scrollX + e.deltaX;
      const newScrollY = scrollY + e.deltaY;
      onScroll(
        Math.max(0, Math.min(newScrollX, gridWidth - (containerRef.current?.clientWidth ?? 0))),
        Math.max(0, Math.min(newScrollY, gridHeight - (containerRef.current?.clientHeight ?? 0)))
      );
    },
    [scrollX, scrollY, gridWidth, gridHeight, onScroll]
  );

  // Register global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState) {
        onDragEnd();
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [dragState, onDragEnd]);

  // Header height constant
  const HEADER_HEIGHT = 20;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative bg-gray-950"
      onWheel={handleWheel}
    >
      {/* Grid area - offset by header height */}
      <div
        ref={gridRef}
        className="absolute cursor-crosshair select-none"
        style={{
          top: HEADER_HEIGHT,
          width: gridWidth,
          height: gridHeight,
          transform: `translate(${-scrollX}px, ${-scrollY}px)`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Row backgrounds (alternating for black keys) */}
        {Array.from({ length: noteRange.high - noteRange.low + 1 }, (_, i) => {
          const note = noteRange.high - i;
          const isBlack = isBlackKey(note);
          return (
            <div
              key={`row-${note}`}
              className={`absolute left-0 right-0 ${
                isBlack ? "bg-gray-900/50" : "bg-transparent"
              }`}
              style={{
                top: i * verticalZoom,
                height: verticalZoom,
              }}
            />
          );
        })}

        {/* Horizontal row lines */}
        {Array.from({ length: noteRange.high - noteRange.low + 1 }, (_, i) => (
          <div
            key={`hline-${i}`}
            className="absolute left-0 right-0 border-b border-gray-800/50"
            style={{ top: i * verticalZoom }}
          />
        ))}

        {/* Vertical grid lines */}
        {gridLines.map((line, i) => (
          <div
            key={`vline-${i}`}
            className={`absolute top-0 bottom-0 ${
              line.type === "bar"
                ? "border-l border-gray-600"
                : line.type === "beat"
                ? "border-l border-gray-700/70"
                : "border-l border-gray-800/40"
            }`}
            style={{ left: line.x }}
          />
        ))}

        {/* Notes */}
        {notes.map((note) => {
          const noteX = ticksToPixels(note.startTick, horizontalZoom, ticksPerBeat);
          const noteWidth = Math.max(4, ticksToPixels(note.duration, horizontalZoom, ticksPerBeat));
          const noteY = noteToY(note.pitch, noteRange.high, verticalZoom);
          const isSelected = selection.noteIds.has(note.id);
          const color = showVelocity
            ? getVelocityColor(note.velocity)
            : isSelected
            ? NOTE_COLORS.selected
            : NOTE_COLORS.default;

          return (
            <div
              key={note.id}
              className={`
                absolute rounded-sm cursor-pointer transition-colors
                ${color}
                ${isSelected ? "ring-2 ring-white/50" : ""}
                hover:brightness-110
              `}
              style={{
                left: noteX,
                top: noteY + 1,
                width: noteWidth - 1,
                height: verticalZoom - 2,
                opacity: showVelocity ? 0.5 + (note.velocity / 127) * 0.5 : 1,
              }}
            >
              {/* Velocity bar */}
              {showVelocity && (
                <div
                  className="absolute bottom-0 left-0 right-0 bg-white/30"
                  style={{
                    height: `${(note.velocity / 127) * 100}%`,
                  }}
                />
              )}
              {/* Resize handles */}
              <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize" />
              <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize" />
            </div>
          );
        })}

        {/* Playhead */}
        {playheadTick !== undefined && playheadTick >= 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
            style={{
              left: ticksToPixels(playheadTick, horizontalZoom, ticksPerBeat),
            }}
          />
        )}

        {/* Selection box */}
        {dragState?.type === "select" && selectionBoxRef.current && (
          <div
            className="absolute border border-cyan-400 bg-cyan-400/20 pointer-events-none z-10"
            style={{
              left: Math.min(selectionBoxRef.current.x1, selectionBoxRef.current.x2),
              top: Math.min(selectionBoxRef.current.y1, selectionBoxRef.current.y2),
              width: Math.abs(selectionBoxRef.current.x2 - selectionBoxRef.current.x1),
              height: Math.abs(selectionBoxRef.current.y2 - selectionBoxRef.current.y1),
            }}
          />
        )}
      </div>

      {/* Bar numbers header (fixed at top) */}
      <div
        className="absolute top-0 left-0 right-0 h-5 bg-gray-900 border-b border-gray-700 flex items-end z-20 overflow-hidden"
        style={{ paddingLeft: 0 }}
      >
        <div
          className="relative h-full"
          style={{
            width: gridWidth,
            transform: `translateX(${-scrollX}px)`,
          }}
        >
          {Array.from({ length: bars }, (_, i) => (
            <span
              key={i}
              className="absolute text-[10px] text-gray-400 font-mono"
              style={{
                left: ticksToPixels(i * 4 * ticksPerBeat, horizontalZoom, ticksPerBeat) + 4,
                bottom: 2,
              }}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

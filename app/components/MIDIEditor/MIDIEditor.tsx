/**
 * Main MIDI Editor component - a piano roll sequencer
 */

import { useCallback, useRef, useMemo } from "react";
import type { MIDIEditorConfig, MIDIEditorTool, QuantizeValue, MIDINote } from "@/types";
import { useMIDIEditorState } from "@/hooks";
import {
  QUANTIZE_OPTIONS,
  TICKS_PER_BEAT,
  ticksToPixels,
  pixelsToTicks,
  noteToY,
  yToNote,
  quantizeTick,
  getNotesInRect,
} from "@/utils";
import { PianoKeyboard } from "./PianoKeyboard";
import { MIDINoteGrid } from "./MIDINoteGrid";
import { VelocityLane } from "./VelocityLane";

export type MIDIEditorProps = {
  config?: MIDIEditorConfig;
  playheadTick?: number;
  onPlayNote?: (note: number, velocity: number) => void;
  expanded?: boolean;
  setExpanded?: (v: boolean) => void;
  height?: number;
  onResizeStart?: (e: React.MouseEvent) => void;
  // Controlled mode props
  externalNotes?: MIDINote[];
  onNotesChange?: (notes: MIDINote[]) => void;
  externalBars?: number;
  patternName?: string;
};

const TOOLS: { id: MIDIEditorTool; label: string; icon: string }[] = [
  { id: "select", label: "Select", icon: "⬚" },
  { id: "draw", label: "Draw", icon: "✎" },
  { id: "erase", label: "Erase", icon: "✕" },
  { id: "velocity", label: "Velocity", icon: "▮" },
];

export function MIDIEditor({
  config,
  playheadTick,
  onPlayNote,
  expanded = true,
  setExpanded,
  height = 300,
  onResizeStart,
  externalNotes,
  onNotesChange,
  externalBars,
  patternName,
}: MIDIEditorProps) {
  const editor = useMIDIEditorState();
  const gridRef = useRef<HTMLDivElement>(null);
  const lastDragPos = useRef<{ x: number; y: number } | null>(null);

  // Determine if we're in controlled mode
  const isControlled = externalNotes !== undefined && onNotesChange !== undefined;

  const {
    pattern: internalPattern,
    notes: internalNotes,
    viewSettings,
    tool,
    setTool,
    dragState,
    setDragState,
    selection,
    addNote: internalAddNote,
    updateNote: internalUpdateNote,
    deleteNote: internalDeleteNote,
    deleteSelectedNotes: internalDeleteSelectedNotes,
    moveNotes: internalMoveNotes,
    resizeNotes: internalResizeNotes,
    selectNote,
    selectNotes,
    selectAll: internalSelectAll,
    clearSelection,
    setHorizontalZoom,
    setVerticalZoom,
    setScroll,
    setQuantize,
    setSnapToGrid,
    setShowVelocity,
    setPatternBars: internalSetPatternBars,
    renamePattern: internalRenamePattern,
    clearPattern: internalClearPattern,
    copyNotes,
    cutNotes,
    pasteNotes: internalPasteNotes,
    undo: internalUndo,
    canUndo: internalCanUndo,
    setNoteVelocity: internalSetNoteVelocity,
    setPattern,
  } = editor;

  // Use external or internal values based on mode
  const notes = isControlled ? externalNotes : internalNotes;
  const pattern = isControlled
    ? { ...internalPattern, notes: externalNotes, bars: externalBars ?? internalPattern.bars, name: patternName ?? internalPattern.name }
    : internalPattern;
  const canUndo = isControlled ? false : internalCanUndo;

  // Wrapper functions that call onNotesChange in controlled mode
  const notifyChange = useCallback((newNotes: MIDINote[]) => {
    if (isControlled && onNotesChange) {
      onNotesChange(newNotes);
    }
  }, [isControlled, onNotesChange]);

  const addNote = useCallback(
    (pitch: number, startTick: number, duration?: number, velocity?: number) => {
      const newNote = internalAddNote(pitch, startTick, duration, velocity);
      if (isControlled) {
        notifyChange([...notes, newNote]);
      }
      return newNote;
    },
    [internalAddNote, isControlled, notes, notifyChange]
  );

  const updateNote = useCallback(
    (noteId: string, updates: Partial<Omit<MIDINote, "id">>) => {
      internalUpdateNote(noteId, updates);
      if (isControlled) {
        notifyChange(notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n)));
      }
    },
    [internalUpdateNote, isControlled, notes, notifyChange]
  );

  const deleteNote = useCallback(
    (noteId: string) => {
      internalDeleteNote(noteId);
      if (isControlled) {
        notifyChange(notes.filter((n) => n.id !== noteId));
      }
    },
    [internalDeleteNote, isControlled, notes, notifyChange]
  );

  const deleteSelectedNotes = useCallback(() => {
    internalDeleteSelectedNotes();
    if (isControlled) {
      notifyChange(notes.filter((n) => !selection.noteIds.has(n.id)));
    }
  }, [internalDeleteSelectedNotes, isControlled, notes, selection.noteIds, notifyChange]);

  const moveNotes = useCallback(
    (noteIds: string[], tickDelta: number, pitchDelta: number) => {
      internalMoveNotes(noteIds, tickDelta, pitchDelta);
      if (isControlled) {
        notifyChange(
          notes.map((n) =>
            noteIds.includes(n.id)
              ? {
                  ...n,
                  startTick: Math.max(0, n.startTick + tickDelta),
                  pitch: Math.max(0, Math.min(127, n.pitch + pitchDelta)),
                }
              : n
          )
        );
      }
    },
    [internalMoveNotes, isControlled, notes, notifyChange]
  );

  const resizeNotes = useCallback(
    (noteIds: string[], durationDelta: number, fromStart?: boolean) => {
      internalResizeNotes(noteIds, durationDelta, fromStart);
      if (isControlled) {
        notifyChange(
          notes.map((n) => {
            if (!noteIds.includes(n.id)) return n;
            if (fromStart) {
              return {
                ...n,
                startTick: Math.max(0, n.startTick + durationDelta),
                duration: Math.max(1, n.duration - durationDelta),
              };
            }
            return { ...n, duration: Math.max(1, n.duration + durationDelta) };
          })
        );
      }
    },
    [internalResizeNotes, isControlled, notes, notifyChange]
  );

  const setNoteVelocity = useCallback(
    (noteIds: string[], velocity: number) => {
      internalSetNoteVelocity(noteIds, velocity);
      if (isControlled) {
        const clampedVelocity = Math.max(1, Math.min(127, velocity));
        notifyChange(
          notes.map((n) => (noteIds.includes(n.id) ? { ...n, velocity: clampedVelocity } : n))
        );
      }
    },
    [internalSetNoteVelocity, isControlled, notes, notifyChange]
  );

  const clearPattern = useCallback(() => {
    internalClearPattern();
    if (isControlled) {
      notifyChange([]);
    }
  }, [internalClearPattern, isControlled, notifyChange]);

  const selectAll = useCallback(() => {
    selectNotes(notes.map((n) => n.id), true);
  }, [selectNotes, notes]);

  const undo = useCallback(() => {
    if (!isControlled) {
      internalUndo();
    }
  }, [isControlled, internalUndo]);

  const renamePattern = useCallback(
    (name: string) => {
      if (!isControlled) {
        internalRenamePattern(name);
      }
    },
    [isControlled, internalRenamePattern]
  );

  const setPatternBars = useCallback(
    (bars: number) => {
      if (!isControlled) {
        internalSetPatternBars(bars);
      }
    },
    [isControlled, internalSetPatternBars]
  );

  const pasteNotes = useCallback(
    (atTick?: number) => {
      internalPasteNotes(atTick);
      // Note: For controlled mode, we'd need to track clipboard externally
    },
    [internalPasteNotes]
  );

  // Get highlighted notes (notes being played)
  const highlightedNotes = useMemo(() => {
    const highlighted = new Set<number>();
    notes.forEach((note) => {
      if (selection.noteIds.has(note.id)) {
        highlighted.add(note.pitch);
      }
    });
    return highlighted;
  }, [notes, selection.noteIds]);

  // Handle note click
  const handleNoteClick = useCallback(
    (noteId: string, e: React.MouseEvent) => {
      if (tool === "erase") {
        deleteNote(noteId);
      } else if (tool === "velocity") {
        // Velocity tool - handled by drag
      } else {
        selectNote(noteId, e.shiftKey || e.metaKey);
      }
    },
    [tool, deleteNote, selectNote]
  );

  // Handle note double click (delete)
  const handleNoteDoubleClick = useCallback(
    (noteId: string) => {
      deleteNote(noteId);
    },
    [deleteNote]
  );

  // Handle note delete (for right-click)
  const handleNoteDelete = useCallback(
    (noteId: string) => {
      deleteNote(noteId);
    },
    [deleteNote]
  );

  // Handle duplicate start (option+click)
  const handleDuplicateStart = useCallback(
    (noteId: string) => {
      // Find the note and duplicate it
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        const newNote = addNote(note.pitch, note.startTick, note.duration, note.velocity);
        selectNote(newNote.id, false);
      }
    },
    [notes, addNote, selectNote]
  );

  // Handle grid click (create note in draw mode)
  const handleGridClick = useCallback(
    (tick: number, pitch: number, e: React.MouseEvent) => {
      if (tool === "draw") {
        const defaultDuration = editor.viewSettings.snapToGrid
          ? quantizeTick(pattern.ticksPerBeat, viewSettings.quantize, pattern.ticksPerBeat)
          : pattern.ticksPerBeat;
        const newNote = addNote(pitch, tick, defaultDuration);
        selectNote(newNote.id, false);
        onPlayNote?.(pitch, 100);
      } else if (tool === "select") {
        if (!e.shiftKey && !e.metaKey) {
          clearSelection();
        }
      }
    },
    [tool, addNote, selectNote, clearSelection, onPlayNote, pattern.ticksPerBeat, viewSettings.quantize, editor.viewSettings.snapToGrid]
  );

  // Handle grid double click (create note)
  const handleGridDoubleClick = useCallback(
    (tick: number, pitch: number) => {
      const defaultDuration = editor.viewSettings.snapToGrid
        ? quantizeTick(pattern.ticksPerBeat, viewSettings.quantize, pattern.ticksPerBeat)
        : pattern.ticksPerBeat;
      const newNote = addNote(pitch, tick, defaultDuration);
      selectNote(newNote.id, false);
      onPlayNote?.(pitch, 100);
    },
    [addNote, selectNote, onPlayNote, pattern.ticksPerBeat, viewSettings.quantize, editor.viewSettings.snapToGrid]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (state: typeof dragState) => {
      setDragState(state);
      lastDragPos.current = state ? { x: state.startX, y: state.startY } : null;
    },
    [setDragState]
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !gridRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + viewSettings.scrollX;
      const y = e.clientY - rect.top + viewSettings.scrollY;

      if (!lastDragPos.current) {
        lastDragPos.current = { x, y };
        return;
      }

      const deltaX = x - dragState.startX;
      const deltaY = y - dragState.startY;

      if (dragState.type === "move" && dragState.noteId && dragState.originalNote) {
        const tickDelta = pixelsToTicks(deltaX, viewSettings.horizontalZoom, pattern.ticksPerBeat);
        const pitchDelta = -Math.round(deltaY / viewSettings.verticalZoom);

        const notesToMove = selection.noteIds.has(dragState.noteId)
          ? Array.from(selection.noteIds)
          : [dragState.noteId];

        // Calculate movement from original position
        const quantizedTickDelta = viewSettings.snapToGrid
          ? quantizeTick(tickDelta, viewSettings.quantize, pattern.ticksPerBeat)
          : Math.round(tickDelta);

        moveNotes(
          notesToMove,
          quantizedTickDelta - (notes.find((n) => n.id === dragState.noteId)?.startTick ?? 0) + dragState.originalNote.startTick,
          pitchDelta - ((notes.find((n) => n.id === dragState.noteId)?.pitch ?? 0) - dragState.originalNote.pitch)
        );
      } else if (dragState.type === "resize-end" && dragState.noteId && dragState.originalNote) {
        const tickDelta = pixelsToTicks(deltaX, viewSettings.horizontalZoom, pattern.ticksPerBeat);
        const notesToResize = selection.noteIds.has(dragState.noteId)
          ? Array.from(selection.noteIds)
          : [dragState.noteId];

        resizeNotes(
          notesToResize,
          tickDelta - ((notes.find((n) => n.id === dragState.noteId)?.duration ?? 0) - dragState.originalNote.duration),
          false
        );
      } else if (dragState.type === "resize-start" && dragState.noteId && dragState.originalNote) {
        const tickDelta = pixelsToTicks(deltaX, viewSettings.horizontalZoom, pattern.ticksPerBeat);
        const notesToResize = selection.noteIds.has(dragState.noteId)
          ? Array.from(selection.noteIds)
          : [dragState.noteId];

        resizeNotes(
          notesToResize,
          tickDelta - (dragState.originalNote.startTick - (notes.find((n) => n.id === dragState.noteId)?.startTick ?? 0)),
          true
        );
      } else if (dragState.type === "draw" && dragState.startTick !== undefined) {
        // Extend the note being drawn
        const currentTick = pixelsToTicks(x, viewSettings.horizontalZoom, pattern.ticksPerBeat);
        const newDuration = Math.max(
          pattern.ticksPerBeat / 4,
          currentTick - dragState.startTick
        );

        // Find the note we just created and update its duration
        const recentNote = notes.find(
          (n) => n.startTick === dragState.startTick && n.pitch === dragState.startPitch
        );
        if (recentNote) {
          updateNote(recentNote.id, {
            duration: viewSettings.snapToGrid
              ? quantizeTick(newDuration, viewSettings.quantize, pattern.ticksPerBeat)
              : newDuration,
          });
        }
      } else if (dragState.type === "select") {
        // Update selection box and select notes within it
        const selectedNotes = getNotesInRect(
          notes,
          {
            x1: dragState.startX,
            y1: dragState.startY,
            x2: x,
            y2: y,
          },
          viewSettings,
          pattern.ticksPerBeat
        );
        selectNotes(
          selectedNotes.map((n) => n.id),
          true
        );
      }

      lastDragPos.current = { x, y };
    },
    [
      dragState,
      viewSettings,
      pattern.ticksPerBeat,
      notes,
      selection.noteIds,
      moveNotes,
      resizeNotes,
      updateNote,
      selectNotes,
    ]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDragState(null);
    lastDragPos.current = null;
  }, [setDragState]);

  // Handle scroll
  const handleScroll = useCallback(
    (x: number, y: number) => {
      setScroll(x, y);
    },
    [setScroll]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Don't handle if typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      const isMeta = e.metaKey || e.ctrlKey;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelectedNotes();
      } else if (isMeta && e.key === "a") {
        e.preventDefault();
        selectAll();
      } else if (isMeta && e.key === "c") {
        e.preventDefault();
        copyNotes();
      } else if (isMeta && e.key === "x") {
        e.preventDefault();
        cutNotes();
      } else if (isMeta && e.key === "v") {
        e.preventDefault();
        pasteNotes(playheadTick ?? 0);
      } else if (isMeta && e.key === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "1") {
        setTool("select");
      } else if (e.key === "2") {
        setTool("draw");
      } else if (e.key === "3") {
        setTool("erase");
      } else if (e.key === "4") {
        setTool("velocity");
      } else if (e.key === "Escape") {
        clearSelection();
      }
    },
    [
      deleteSelectedNotes,
      selectAll,
      copyNotes,
      cutNotes,
      pasteNotes,
      undo,
      setTool,
      clearSelection,
      playheadTick,
    ]
  );

  // Handle piano key click
  const handleKeyClick = useCallback(
    (note: number) => {
      onPlayNote?.(note, 100);
    },
    [onPlayNote]
  );

  if (!expanded) {
    return (
      <div className="bg-black/90 border-t border-gray-800">
        <div
          className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-white/5"
          onClick={() => setExpanded?.(true)}
        >
          <h2 className="text-sm font-semibold">MIDI Editor</h2>
          <span className="text-gray-400">▲</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-black/90 border-t border-gray-800 flex flex-col outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Resize handle */}
      {onResizeStart && (
        <div
          className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-cyan-500/50 transition-colors z-10"
          onMouseDown={onResizeStart}
        />
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-white/5 border-b border-gray-800"
        onClick={() => setExpanded?.(false)}
      >
        <h2 className="text-sm font-semibold">MIDI Editor</h2>
        <span className="text-gray-400">▼</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-700 flex-wrap">
        {/* Pattern name */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={pattern.name}
            onChange={(e) => renamePattern(e.target.value)}
            className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded w-32"
            placeholder="Pattern name"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Tools */}
        <div className="flex items-center gap-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`px-2 py-1 text-xs rounded ${
                tool === t.id
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
              title={`${t.label} (${TOOLS.indexOf(t) + 1})`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Quantize */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Quantize:</span>
          <select
            value={viewSettings.quantize}
            onChange={(e) => setQuantize(e.target.value as QuantizeValue)}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white border-none cursor-pointer"
          >
            {QUANTIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={viewSettings.snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className="accent-cyan-500"
            />
            Snap
          </label>
        </div>

        {/* Pattern length */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Bars:</span>
          <select
            value={pattern.bars}
            onChange={(e) => setPatternBars(Number(e.target.value))}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white border-none cursor-pointer"
          >
            {[1, 2, 4, 8, 16, 32].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* View options */}
        <div className="flex items-center gap-2 ml-auto">
          <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={viewSettings.showVelocity}
              onChange={(e) => setShowVelocity(e.target.checked)}
              className="accent-cyan-500"
            />
            Velocity
          </label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">H:</span>
            <input
              type="range"
              min="20"
              max="200"
              value={viewSettings.horizontalZoom}
              onChange={(e) => setHorizontalZoom(Number(e.target.value))}
              className="w-16 accent-gray-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">V:</span>
            <input
              type="range"
              min="8"
              max="32"
              value={viewSettings.verticalZoom}
              onChange={(e) => setVerticalZoom(Number(e.target.value))}
              className="w-16 accent-gray-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {canUndo && (
            <button
              onClick={undo}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
              title="Undo (Cmd+Z)"
            >
              Undo
            </button>
          )}
          <button
            onClick={clearPattern}
            className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 rounded"
            title="Clear all notes"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex flex-col flex-1">
        <div
          ref={gridRef}
          className="flex flex-1"
          style={{ height: viewSettings.showVelocity ? height - 60 : height }}
        >
          {/* Piano keyboard */}
          <PianoKeyboard
            noteRange={viewSettings.noteRange}
            verticalZoom={viewSettings.verticalZoom}
            scrollY={viewSettings.scrollY}
            config={config}
            onKeyClick={handleKeyClick}
            highlightedNotes={highlightedNotes}
          />

          {/* Note grid */}
          <MIDINoteGrid
            notes={notes}
            viewSettings={viewSettings}
            bars={pattern.bars}
            ticksPerBeat={pattern.ticksPerBeat}
            tool={tool}
            dragState={dragState}
            selection={selection}
            playheadTick={playheadTick}
            onNoteClick={handleNoteClick}
            onNoteDoubleClick={handleNoteDoubleClick}
            onNoteDelete={handleNoteDelete}
            onGridClick={handleGridClick}
            onGridDoubleClick={handleGridDoubleClick}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onScroll={handleScroll}
            onDuplicateStart={handleDuplicateStart}
          />
        </div>

        {/* Velocity lane */}
        {viewSettings.showVelocity && (
          <div className="flex">
            <div style={{ width: config?.type === "drums" ? 100 : 60 }} className="flex-shrink-0" />
            <VelocityLane
              notes={notes}
              viewSettings={viewSettings}
              bars={pattern.bars}
              ticksPerBeat={pattern.ticksPerBeat}
              selectedNoteIds={selection.noteIds}
              onVelocityChange={setNoteVelocity}
              height={60}
            />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-1 border-t border-gray-700 text-xs text-gray-500">
        <span>Notes: {notes.length}</span>
        <span>Selected: {selection.noteIds.size}</span>
        <span className="ml-auto">
          Keys: 1-Select 2-Draw 3-Erase 4-Velocity | Del-Delete | Cmd+A/C/X/V/Z
        </span>
      </div>
    </div>
  );
}

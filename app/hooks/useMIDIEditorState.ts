/**
 * Hook for managing MIDI editor state
 */

import { useState, useCallback, useMemo } from "react";
import type {
  MIDINote,
  MIDIPattern,
  MIDIDragState,
  MIDISelection,
  MIDIEditorTool,
  MIDIEditorViewSettings,
  QuantizeValue,
} from "@/types";
import {
  DEFAULT_MIDI_VIEW_SETTINGS,
  TICKS_PER_BEAT,
  createMIDINote,
  quantizeTick,
  getPatternDurationTicks,
  sortNotes,
} from "@/utils";
import { generateId } from "@/utils/id";

export type MIDIEditorStateReturn = {
  // Pattern management
  pattern: MIDIPattern;
  setPattern: (pattern: MIDIPattern) => void;
  notes: MIDINote[];

  // Note operations
  addNote: (pitch: number, startTick: number, duration?: number, velocity?: number) => MIDINote;
  updateNote: (noteId: string, updates: Partial<Omit<MIDINote, "id">>) => void;
  deleteNote: (noteId: string) => void;
  deleteSelectedNotes: () => void;
  duplicateSelectedNotes: (offsetTicks?: number) => void;
  moveNotes: (noteIds: string[], tickDelta: number, pitchDelta: number) => void;
  resizeNotes: (noteIds: string[], durationDelta: number, fromStart?: boolean) => void;
  setNoteVelocity: (noteIds: string[], velocity: number) => void;
  quantizeNotes: (noteIds: string[]) => void;

  // Selection
  selection: MIDISelection;
  selectNote: (noteId: string, addToSelection?: boolean) => void;
  selectNotes: (noteIds: string[], replace?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isNoteSelected: (noteId: string) => boolean;

  // Tool & drag state
  tool: MIDIEditorTool;
  setTool: (tool: MIDIEditorTool) => void;
  dragState: MIDIDragState;
  setDragState: (state: MIDIDragState) => void;

  // View settings
  viewSettings: MIDIEditorViewSettings;
  setHorizontalZoom: (zoom: number) => void;
  setVerticalZoom: (zoom: number) => void;
  setScroll: (x: number, y: number) => void;
  setQuantize: (quantize: QuantizeValue) => void;
  setSnapToGrid: (snap: boolean) => void;
  setShowVelocity: (show: boolean) => void;
  setNoteRange: (low: number, high: number) => void;

  // Pattern settings
  setPatternBars: (bars: number) => void;
  renamePattern: (name: string) => void;
  clearPattern: () => void;

  // Clipboard
  copyNotes: () => void;
  cutNotes: () => void;
  pasteNotes: (atTick?: number) => void;
  clipboard: MIDINote[];

  // Undo/Redo (simplified - just stores last state)
  undo: () => void;
  canUndo: boolean;
};

function createDefaultPattern(name: string = "MIDI Pattern 1"): MIDIPattern {
  return {
    id: generateId(),
    name,
    notes: [],
    bars: 4,
    ticksPerBeat: TICKS_PER_BEAT,
  };
}

export function useMIDIEditorState(initialPattern?: MIDIPattern): MIDIEditorStateReturn {
  // Pattern state
  const [pattern, setPatternInternal] = useState<MIDIPattern>(
    initialPattern ?? createDefaultPattern()
  );

  // History for undo (simplified - single level)
  const [history, setHistory] = useState<MIDIPattern | null>(null);

  // Selection state
  const [selection, setSelection] = useState<MIDISelection>({
    noteIds: new Set(),
  });

  // Tool state
  const [tool, setTool] = useState<MIDIEditorTool>("draw");

  // Drag state
  const [dragState, setDragState] = useState<MIDIDragState>(null);

  // View settings
  const [viewSettings, setViewSettings] = useState<MIDIEditorViewSettings>(
    DEFAULT_MIDI_VIEW_SETTINGS
  );

  // Clipboard
  const [clipboard, setClipboard] = useState<MIDINote[]>([]);

  // Save to history before making changes
  const saveHistory = useCallback(() => {
    setHistory({ ...pattern, notes: [...pattern.notes] });
  }, [pattern]);

  // Set pattern with history
  const setPattern = useCallback(
    (newPattern: MIDIPattern) => {
      saveHistory();
      setPatternInternal(newPattern);
    },
    [saveHistory]
  );

  // Sorted notes for consistent rendering
  const notes = useMemo(() => sortNotes(pattern.notes), [pattern.notes]);

  // Note operations
  const addNote = useCallback(
    (
      pitch: number,
      startTick: number,
      duration: number = pattern.ticksPerBeat,
      velocity: number = 100
    ): MIDINote => {
      saveHistory();

      // Quantize if enabled
      const quantizedStart = viewSettings.snapToGrid
        ? quantizeTick(startTick, viewSettings.quantize, pattern.ticksPerBeat)
        : startTick;

      const quantizedDuration = viewSettings.snapToGrid
        ? Math.max(
            quantizeTick(duration, viewSettings.quantize, pattern.ticksPerBeat),
            quantizeTick(pattern.ticksPerBeat / 4, viewSettings.quantize, pattern.ticksPerBeat)
          )
        : duration;

      const note = createMIDINote(pitch, quantizedStart, quantizedDuration, velocity);

      setPatternInternal((prev) => ({
        ...prev,
        notes: [...prev.notes, note],
      }));

      return note;
    },
    [pattern.ticksPerBeat, viewSettings.snapToGrid, viewSettings.quantize, saveHistory]
  );

  const updateNote = useCallback(
    (noteId: string, updates: Partial<Omit<MIDINote, "id">>) => {
      saveHistory();
      setPatternInternal((prev) => ({
        ...prev,
        notes: prev.notes.map((note) =>
          note.id === noteId ? { ...note, ...updates } : note
        ),
      }));
    },
    [saveHistory]
  );

  const deleteNote = useCallback(
    (noteId: string) => {
      saveHistory();
      setPatternInternal((prev) => ({
        ...prev,
        notes: prev.notes.filter((note) => note.id !== noteId),
      }));
      setSelection((prev) => {
        const newIds = new Set(prev.noteIds);
        newIds.delete(noteId);
        return { ...prev, noteIds: newIds };
      });
    },
    [saveHistory]
  );

  const deleteSelectedNotes = useCallback(() => {
    if (selection.noteIds.size === 0) return;
    saveHistory();
    setPatternInternal((prev) => ({
      ...prev,
      notes: prev.notes.filter((note) => !selection.noteIds.has(note.id)),
    }));
    setSelection({ noteIds: new Set() });
  }, [selection.noteIds, saveHistory]);

  const duplicateSelectedNotes = useCallback(
    (offsetTicks: number = pattern.ticksPerBeat) => {
      if (selection.noteIds.size === 0) return;
      saveHistory();

      const selectedNotes = pattern.notes.filter((note) =>
        selection.noteIds.has(note.id)
      );
      const newNotes = selectedNotes.map((note) => ({
        ...note,
        id: generateId(),
        startTick: note.startTick + offsetTicks,
      }));

      setPatternInternal((prev) => ({
        ...prev,
        notes: [...prev.notes, ...newNotes],
      }));

      // Select the new notes
      setSelection({
        noteIds: new Set(newNotes.map((n) => n.id)),
      });
    },
    [pattern.notes, pattern.ticksPerBeat, selection.noteIds, saveHistory]
  );

  const moveNotes = useCallback(
    (noteIds: string[], tickDelta: number, pitchDelta: number) => {
      saveHistory();

      const maxTick = getPatternDurationTicks(pattern.bars, pattern.ticksPerBeat);

      setPatternInternal((prev) => ({
        ...prev,
        notes: prev.notes.map((note) => {
          if (!noteIds.includes(note.id)) return note;

          let newStartTick = note.startTick + tickDelta;
          let newPitch = note.pitch + pitchDelta;

          // Clamp values
          newStartTick = Math.max(0, Math.min(newStartTick, maxTick - note.duration));
          newPitch = Math.max(0, Math.min(127, newPitch));

          // Quantize if enabled
          if (viewSettings.snapToGrid) {
            newStartTick = quantizeTick(
              newStartTick,
              viewSettings.quantize,
              prev.ticksPerBeat
            );
          }

          return { ...note, startTick: newStartTick, pitch: newPitch };
        }),
      }));
    },
    [
      pattern.bars,
      pattern.ticksPerBeat,
      viewSettings.snapToGrid,
      viewSettings.quantize,
      saveHistory,
    ]
  );

  const resizeNotes = useCallback(
    (noteIds: string[], durationDelta: number, fromStart: boolean = false) => {
      saveHistory();

      const minDuration = viewSettings.snapToGrid
        ? quantizeTick(pattern.ticksPerBeat / 4, viewSettings.quantize, pattern.ticksPerBeat)
        : 1;

      setPatternInternal((prev) => ({
        ...prev,
        notes: prev.notes.map((note) => {
          if (!noteIds.includes(note.id)) return note;

          if (fromStart) {
            // Resize from start (changes both start and duration)
            let newStartTick = note.startTick + durationDelta;
            let newDuration = note.duration - durationDelta;

            if (viewSettings.snapToGrid) {
              newStartTick = quantizeTick(
                newStartTick,
                viewSettings.quantize,
                prev.ticksPerBeat
              );
              newDuration = note.startTick + note.duration - newStartTick;
            }

            newStartTick = Math.max(0, newStartTick);
            newDuration = Math.max(minDuration, newDuration);

            return { ...note, startTick: newStartTick, duration: newDuration };
          } else {
            // Resize from end (changes only duration)
            let newDuration = note.duration + durationDelta;

            if (viewSettings.snapToGrid) {
              newDuration = quantizeTick(
                newDuration,
                viewSettings.quantize,
                prev.ticksPerBeat
              );
            }

            newDuration = Math.max(minDuration, newDuration);

            return { ...note, duration: newDuration };
          }
        }),
      }));
    },
    [
      pattern.ticksPerBeat,
      viewSettings.snapToGrid,
      viewSettings.quantize,
      saveHistory,
    ]
  );

  const setNoteVelocity = useCallback(
    (noteIds: string[], velocity: number) => {
      saveHistory();
      const clampedVelocity = Math.max(1, Math.min(127, velocity));
      setPatternInternal((prev) => ({
        ...prev,
        notes: prev.notes.map((note) =>
          noteIds.includes(note.id) ? { ...note, velocity: clampedVelocity } : note
        ),
      }));
    },
    [saveHistory]
  );

  const quantizeNotes = useCallback(
    (noteIds: string[]) => {
      saveHistory();
      setPatternInternal((prev) => ({
        ...prev,
        notes: prev.notes.map((note) => {
          if (!noteIds.includes(note.id)) return note;
          return {
            ...note,
            startTick: quantizeTick(
              note.startTick,
              viewSettings.quantize,
              prev.ticksPerBeat
            ),
            duration: Math.max(
              quantizeTick(prev.ticksPerBeat / 4, viewSettings.quantize, prev.ticksPerBeat),
              quantizeTick(note.duration, viewSettings.quantize, prev.ticksPerBeat)
            ),
          };
        }),
      }));
    },
    [viewSettings.quantize, saveHistory]
  );

  // Selection operations
  const selectNote = useCallback((noteId: string, addToSelection: boolean = false) => {
    setSelection((prev) => {
      const newIds = addToSelection ? new Set(prev.noteIds) : new Set<string>();
      if (prev.noteIds.has(noteId) && addToSelection) {
        newIds.delete(noteId);
      } else {
        newIds.add(noteId);
      }
      return { ...prev, noteIds: newIds };
    });
  }, []);

  const selectNotes = useCallback((noteIds: string[], replace: boolean = true) => {
    setSelection((prev) => {
      const newIds = replace ? new Set(noteIds) : new Set([...prev.noteIds, ...noteIds]);
      return { ...prev, noteIds: newIds };
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelection({
      noteIds: new Set(pattern.notes.map((n) => n.id)),
    });
  }, [pattern.notes]);

  const clearSelection = useCallback(() => {
    setSelection({ noteIds: new Set() });
  }, []);

  const isNoteSelected = useCallback(
    (noteId: string) => selection.noteIds.has(noteId),
    [selection.noteIds]
  );

  // View settings
  const setHorizontalZoom = useCallback((zoom: number) => {
    setViewSettings((prev) => ({
      ...prev,
      horizontalZoom: Math.max(20, Math.min(200, zoom)),
    }));
  }, []);

  const setVerticalZoom = useCallback((zoom: number) => {
    setViewSettings((prev) => ({
      ...prev,
      verticalZoom: Math.max(8, Math.min(32, zoom)),
    }));
  }, []);

  const setScroll = useCallback((x: number, y: number) => {
    setViewSettings((prev) => ({
      ...prev,
      scrollX: Math.max(0, x),
      scrollY: Math.max(0, y),
    }));
  }, []);

  const setQuantize = useCallback((quantize: QuantizeValue) => {
    setViewSettings((prev) => ({ ...prev, quantize }));
  }, []);

  const setSnapToGrid = useCallback((snap: boolean) => {
    setViewSettings((prev) => ({ ...prev, snapToGrid: snap }));
  }, []);

  const setShowVelocity = useCallback((show: boolean) => {
    setViewSettings((prev) => ({ ...prev, showVelocity: show }));
  }, []);

  const setNoteRange = useCallback((low: number, high: number) => {
    setViewSettings((prev) => ({
      ...prev,
      noteRange: { low: Math.max(0, low), high: Math.min(127, high) },
    }));
  }, []);

  // Pattern settings
  const setPatternBars = useCallback(
    (bars: number) => {
      saveHistory();
      const newBars = Math.max(1, Math.min(64, bars));
      const maxTick = getPatternDurationTicks(newBars, pattern.ticksPerBeat);

      // Remove notes that would be outside the new length
      setPatternInternal((prev) => ({
        ...prev,
        bars: newBars,
        notes: prev.notes.filter(
          (note) => note.startTick < maxTick
        ),
      }));
    },
    [pattern.ticksPerBeat, saveHistory]
  );

  const renamePattern = useCallback((name: string) => {
    setPatternInternal((prev) => ({ ...prev, name }));
  }, []);

  const clearPattern = useCallback(() => {
    saveHistory();
    setPatternInternal((prev) => ({ ...prev, notes: [] }));
    setSelection({ noteIds: new Set() });
  }, [saveHistory]);

  // Clipboard operations
  const copyNotes = useCallback(() => {
    const selectedNotes = pattern.notes.filter((note) =>
      selection.noteIds.has(note.id)
    );
    if (selectedNotes.length > 0) {
      // Normalize to start at tick 0
      const minTick = Math.min(...selectedNotes.map((n) => n.startTick));
      setClipboard(
        selectedNotes.map((note) => ({
          ...note,
          startTick: note.startTick - minTick,
        }))
      );
    }
  }, [pattern.notes, selection.noteIds]);

  const cutNotes = useCallback(() => {
    copyNotes();
    deleteSelectedNotes();
  }, [copyNotes, deleteSelectedNotes]);

  const pasteNotes = useCallback(
    (atTick: number = 0) => {
      if (clipboard.length === 0) return;
      saveHistory();

      const quantizedTick = viewSettings.snapToGrid
        ? quantizeTick(atTick, viewSettings.quantize, pattern.ticksPerBeat)
        : atTick;

      const newNotes = clipboard.map((note) => ({
        ...note,
        id: generateId(),
        startTick: note.startTick + quantizedTick,
      }));

      setPatternInternal((prev) => ({
        ...prev,
        notes: [...prev.notes, ...newNotes],
      }));

      // Select pasted notes
      setSelection({
        noteIds: new Set(newNotes.map((n) => n.id)),
      });
    },
    [
      clipboard,
      pattern.ticksPerBeat,
      viewSettings.snapToGrid,
      viewSettings.quantize,
      saveHistory,
    ]
  );

  // Undo
  const undo = useCallback(() => {
    if (history) {
      setPatternInternal(history);
      setHistory(null);
    }
  }, [history]);

  const canUndo = history !== null;

  return {
    pattern,
    setPattern,
    notes,
    addNote,
    updateNote,
    deleteNote,
    deleteSelectedNotes,
    duplicateSelectedNotes,
    moveNotes,
    resizeNotes,
    setNoteVelocity,
    quantizeNotes,
    selection,
    selectNote,
    selectNotes,
    selectAll,
    clearSelection,
    isNoteSelected,
    tool,
    setTool,
    dragState,
    setDragState,
    viewSettings,
    setHorizontalZoom,
    setVerticalZoom,
    setScroll,
    setQuantize,
    setSnapToGrid,
    setShowVelocity,
    setNoteRange,
    setPatternBars,
    renamePattern,
    clearPattern,
    copyNotes,
    cutNotes,
    pasteNotes,
    clipboard,
    undo,
    canUndo,
  };
}

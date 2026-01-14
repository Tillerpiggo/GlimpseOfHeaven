/**
 * Hook to bridge MIDI notes with boolean pattern arrays
 * Maps each drum machine row to a MIDI note for piano roll editing
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import type { MIDINote, MIDIPattern, RowType, EffectRowType } from "@/types";
import { generateId } from "@/utils/id";
import { TICKS_PER_BEAT } from "@/utils/midi";

/**
 * Mapping of row types to MIDI notes
 * Starting from C2 (36) for drum-friendly range
 */
export const ROW_TO_MIDI_NOTE: Record<RowType | EffectRowType, number> = {
  direction: 36, // C2
  circles1Visible: 37, // C#2
  circles2Visible: 38, // D2
  circles1Position: 39, // D#2
  circles2Position: 40, // E2
  circlesGrowth: 41, // F2
  tilt3D: 42, // F#2
  rotationEnabled: 43, // G2
  rotationDirection: 44, // G#2
  flipY: 45, // A2
};

/**
 * Reverse mapping from MIDI note to row type
 */
export const MIDI_NOTE_TO_ROW: Record<number, RowType | EffectRowType> = Object.fromEntries(
  Object.entries(ROW_TO_MIDI_NOTE).map(([row, note]) => [note, row as RowType | EffectRowType])
);

/**
 * Labels for drum mode display
 */
export const DRUM_ROW_LABELS: Record<number, string> = {
  36: "Direction",
  37: "C1 Visible",
  38: "C2 Visible",
  39: "C1 Position",
  40: "C2 Position",
  41: "Growth",
  42: "3D Tilt",
  43: "Rotation On",
  44: "Rotation Dir",
  45: "Flip Y",
};

export type MIDIPatternBridgeProps = {
  // Pattern getters
  getPatternForType: (type: RowType) => { pattern: boolean[]; setPattern: (p: boolean[]) => void };
  getEffectPatternForType: (type: EffectRowType) => { pattern: boolean[]; setPattern: (p: boolean[]) => void };
  // Pattern lengths and subdivisions
  patternLengths: Record<RowType, number>;
  effectPatternLengths: Record<EffectRowType, number>;
  subdivisions: Record<RowType, number>;
  effectSubdivisions: Record<EffectRowType, number>;
  // Pattern metadata
  bars: number;
};

export type MIDIPatternBridgeReturn = {
  // MIDI pattern for the editor
  midiPattern: MIDIPattern;
  // Update from MIDI editor changes
  updateFromMIDI: (notes: MIDINote[]) => void;
  // Sync MIDI from current boolean patterns
  syncFromPatterns: () => void;
  // Config for the MIDI editor (drum mode)
  editorConfig: {
    type: "drums";
    defaultOctaveRange: [number, number];
    drumLabels: Record<number, string>;
  };
};

const INSTRUMENT_ROWS: RowType[] = [
  "direction",
  "circles1Visible",
  "circles2Visible",
  "circles1Position",
  "circles2Position",
  "circlesGrowth",
  "tilt3D",
];

const EFFECT_ROWS: EffectRowType[] = [
  "rotationEnabled",
  "rotationDirection",
  "flipY",
];

export function useMIDIPatternBridge({
  getPatternForType,
  getEffectPatternForType,
  patternLengths,
  effectPatternLengths,
  subdivisions,
  effectSubdivisions,
  bars,
}: MIDIPatternBridgeProps): MIDIPatternBridgeReturn {
  const [midiPatternId] = useState(() => generateId());

  /**
   * Convert boolean patterns to MIDI notes
   * Each "true" in a boolean pattern becomes a short MIDI note
   */
  const convertPatternsToMIDI = useCallback((): MIDINote[] => {
    const notes: MIDINote[] = [];
    const ticksPerBeat = TICKS_PER_BEAT;

    // Process instrument rows
    for (const rowType of INSTRUMENT_ROWS) {
      const { pattern } = getPatternForType(rowType);
      const midiNote = ROW_TO_MIDI_NOTE[rowType];
      const baseLength = patternLengths?.[rowType] ?? 16;
      const subdivision = subdivisions?.[rowType] ?? 1;
      const totalCells = Math.max(1, Math.round(baseLength * subdivision));

      // Calculate ticks per cell
      // Pattern length is in beats, so total ticks = baseLength * ticksPerBeat
      // Each cell = totalTicks / totalCells
      const ticksPerCell = (baseLength * ticksPerBeat) / totalCells;

      for (let i = 0; i < pattern.length; i++) {
        if (pattern[i]) {
          notes.push({
            id: generateId(),
            pitch: midiNote,
            startTick: Math.round(i * ticksPerCell),
            duration: Math.round(ticksPerCell * 0.9), // Slightly shorter for visual separation
            velocity: 100,
          });
        }
      }
    }

    // Process effect rows
    for (const rowType of EFFECT_ROWS) {
      const { pattern } = getEffectPatternForType(rowType);
      const midiNote = ROW_TO_MIDI_NOTE[rowType];
      const baseLength = effectPatternLengths?.[rowType] ?? 16;
      const subdivision = effectSubdivisions?.[rowType] ?? 1;
      const totalCells = Math.max(1, Math.round(baseLength * subdivision));
      const ticksPerCell = (baseLength * TICKS_PER_BEAT) / totalCells;

      for (let i = 0; i < pattern.length; i++) {
        if (pattern[i]) {
          notes.push({
            id: generateId(),
            pitch: midiNote,
            startTick: Math.round(i * ticksPerCell),
            duration: Math.round(ticksPerCell * 0.9),
            velocity: 100,
          });
        }
      }
    }

    return notes;
  }, [
    getPatternForType,
    getEffectPatternForType,
    patternLengths,
    effectPatternLengths,
    subdivisions,
    effectSubdivisions,
  ]);

  /**
   * Convert MIDI notes back to boolean patterns
   */
  const convertMIDIToPatterns = useCallback(
    (notes: MIDINote[]) => {
      const ticksPerBeat = TICKS_PER_BEAT;

      // Process instrument rows
      for (const rowType of INSTRUMENT_ROWS) {
        const { setPattern } = getPatternForType(rowType);
        const midiNote = ROW_TO_MIDI_NOTE[rowType];
        const baseLength = patternLengths?.[rowType] ?? 16;
        const subdivision = subdivisions?.[rowType] ?? 1;
        const totalCells = Math.max(1, Math.round(baseLength * subdivision));
        const ticksPerCell = (baseLength * ticksPerBeat) / totalCells;

        // Create new boolean pattern
        const newPattern = Array(totalCells).fill(false);

        // Find all notes for this row
        const rowNotes = notes.filter((n) => n.pitch === midiNote);

        for (const note of rowNotes) {
          // Find which cell this note falls into
          const cellIndex = Math.round(note.startTick / ticksPerCell);
          if (cellIndex >= 0 && cellIndex < totalCells) {
            newPattern[cellIndex] = true;
          }
        }

        setPattern(newPattern);
      }

      // Process effect rows
      for (const rowType of EFFECT_ROWS) {
        const { setPattern } = getEffectPatternForType(rowType);
        const midiNote = ROW_TO_MIDI_NOTE[rowType];
        const baseLength = effectPatternLengths?.[rowType] ?? 16;
        const subdivision = effectSubdivisions?.[rowType] ?? 1;
        const totalCells = Math.max(1, Math.round(baseLength * subdivision));
        const ticksPerCell = (baseLength * ticksPerBeat) / totalCells;

        const newPattern = Array(totalCells).fill(false);
        const rowNotes = notes.filter((n) => n.pitch === midiNote);

        for (const note of rowNotes) {
          const cellIndex = Math.round(note.startTick / ticksPerCell);
          if (cellIndex >= 0 && cellIndex < totalCells) {
            newPattern[cellIndex] = true;
          }
        }

        setPattern(newPattern);
      }
    },
    [
      getPatternForType,
      getEffectPatternForType,
      patternLengths,
      effectPatternLengths,
      subdivisions,
      effectSubdivisions,
    ]
  );

  // Initial MIDI pattern state
  const [midiNotes, setMidiNotes] = useState<MIDINote[]>(() => convertPatternsToMIDI());

  // Sync from patterns whenever they change
  const syncFromPatterns = useCallback(() => {
    setMidiNotes(convertPatternsToMIDI());
  }, [convertPatternsToMIDI]);

  // Update boolean patterns from MIDI notes
  const updateFromMIDI = useCallback(
    (notes: MIDINote[]) => {
      setMidiNotes(notes);
      convertMIDIToPatterns(notes);
    },
    [convertMIDIToPatterns]
  );

  // Create the MIDI pattern object
  const midiPattern: MIDIPattern = useMemo(
    () => ({
      id: midiPatternId,
      name: "Pattern",
      notes: midiNotes,
      bars,
      ticksPerBeat: TICKS_PER_BEAT,
    }),
    [midiPatternId, midiNotes, bars]
  );

  // Editor config for drum mode
  const editorConfig = useMemo(
    () => ({
      type: "drums" as const,
      defaultOctaveRange: [2, 3] as [number, number],
      drumLabels: DRUM_ROW_LABELS,
    }),
    []
  );

  return {
    midiPattern,
    updateFromMIDI,
    syncFromPatterns,
    editorConfig,
  };
}

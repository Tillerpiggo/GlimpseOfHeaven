/**
 * MIDI Editor types for the piano roll sequencer
 */

/**
 * A single MIDI note event
 */
export type MIDINote = {
  id: string;
  pitch: number; // MIDI note number (0-127, middle C = 60)
  startTick: number; // Start position in ticks
  duration: number; // Duration in ticks
  velocity: number; // 0-127
};

/**
 * A MIDI pattern containing notes and timing information
 */
export type MIDIPattern = {
  id: string;
  name: string;
  notes: MIDINote[];
  bars: number; // Length in bars
  ticksPerBeat: number; // Resolution (default 480)
};

/**
 * Quantization value options (in terms of beat divisions)
 * 1 = whole note, 4 = quarter note, 8 = eighth note, etc.
 */
export type QuantizeValue = 1 | 2 | 4 | 8 | 16 | 32 | "triplet-8" | "triplet-16" | "off";

/**
 * State for drag operations on MIDI notes
 */
export type MIDIDragState = {
  type: "move" | "resize-start" | "resize-end" | "select" | "draw";
  noteId?: string;
  startX: number;
  startY: number;
  startTick?: number;
  startPitch?: number;
  originalNote?: MIDINote;
} | null;

/**
 * Selection state for multiple notes
 */
export type MIDISelection = {
  noteIds: Set<string>;
  selectionBox?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  };
};

/**
 * Tool mode for the MIDI editor
 */
export type MIDIEditorTool = "select" | "draw" | "erase" | "velocity";

/**
 * View settings for the MIDI editor
 */
export type MIDIEditorViewSettings = {
  horizontalZoom: number; // Pixels per beat
  verticalZoom: number; // Pixels per note row
  scrollX: number; // Horizontal scroll position in pixels
  scrollY: number; // Vertical scroll position in pixels
  snapToGrid: boolean;
  quantize: QuantizeValue;
  showVelocity: boolean;
  noteRange: {
    low: number; // Lowest visible note (default: 36, C2)
    high: number; // Highest visible note (default: 96, C7)
  };
};

/**
 * Piano key information for display
 */
export type PianoKey = {
  note: number;
  name: string;
  isBlack: boolean;
  octave: number;
};

/**
 * MIDI editor configuration for different instrument types
 */
export type MIDIEditorConfig = {
  type: "melodic" | "drums";
  defaultOctaveRange: [number, number]; // [low octave, high octave]
  drumLabels?: Record<number, string>; // Optional custom labels for drum pads
};

/**
 * Playhead position information
 */
export type PlayheadPosition = {
  tick: number;
  beat: number;
  bar: number;
};

/**
 * MIDI utility functions for the piano roll editor
 */

import type { MIDINote, QuantizeValue, PianoKey, MIDIEditorViewSettings } from "@/types";
import { generateId } from "./id";

/**
 * Default ticks per beat (standard MIDI resolution)
 */
export const TICKS_PER_BEAT = 480;

/**
 * Default MIDI editor view settings
 */
export const DEFAULT_MIDI_VIEW_SETTINGS: MIDIEditorViewSettings = {
  horizontalZoom: 80, // pixels per beat
  verticalZoom: 16, // pixels per note row
  scrollX: 0,
  scrollY: 0,
  snapToGrid: true,
  quantize: 16,
  showVelocity: false,
  noteRange: {
    low: 36, // C2
    high: 96, // C7
  },
};

/**
 * Note names in an octave
 */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Black key indices within an octave
 */
const BLACK_KEY_INDICES = new Set([1, 3, 6, 8, 10]);

/**
 * Standard drum kit labels (General MIDI)
 */
export const GM_DRUM_LABELS: Record<number, string> = {
  35: "Acoustic Bass Drum",
  36: "Bass Drum 1",
  37: "Side Stick",
  38: "Acoustic Snare",
  39: "Hand Clap",
  40: "Electric Snare",
  41: "Low Floor Tom",
  42: "Closed Hi-Hat",
  43: "High Floor Tom",
  44: "Pedal Hi-Hat",
  45: "Low Tom",
  46: "Open Hi-Hat",
  47: "Low-Mid Tom",
  48: "Hi-Mid Tom",
  49: "Crash Cymbal 1",
  50: "High Tom",
  51: "Ride Cymbal 1",
  52: "Chinese Cymbal",
  53: "Ride Bell",
  54: "Tambourine",
  55: "Splash Cymbal",
  56: "Cowbell",
  57: "Crash Cymbal 2",
  58: "Vibraslap",
  59: "Ride Cymbal 2",
  60: "Hi Bongo",
  61: "Low Bongo",
  62: "Mute Hi Conga",
  63: "Open Hi Conga",
  64: "Low Conga",
  65: "High Timbale",
  66: "Low Timbale",
  67: "High Agogo",
  68: "Low Agogo",
  69: "Cabasa",
  70: "Maracas",
  71: "Short Whistle",
  72: "Long Whistle",
  73: "Short Guiro",
  74: "Long Guiro",
  75: "Claves",
  76: "Hi Wood Block",
  77: "Low Wood Block",
  78: "Mute Cuica",
  79: "Open Cuica",
  80: "Mute Triangle",
  81: "Open Triangle",
};

/**
 * Get the name of a MIDI note number
 */
export function getNoteName(note: number): string {
  const octave = Math.floor(note / 12) - 1;
  const noteName = NOTE_NAMES[note % 12];
  return `${noteName}${octave}`;
}

/**
 * Check if a note number corresponds to a black key
 */
export function isBlackKey(note: number): boolean {
  return BLACK_KEY_INDICES.has(note % 12);
}

/**
 * Get piano key information for a range of notes
 */
export function getPianoKeys(lowNote: number, highNote: number): PianoKey[] {
  const keys: PianoKey[] = [];
  for (let note = highNote; note >= lowNote; note--) {
    keys.push({
      note,
      name: getNoteName(note),
      isBlack: isBlackKey(note),
      octave: Math.floor(note / 12) - 1,
    });
  }
  return keys;
}

/**
 * Get the quantize value in ticks
 */
export function getQuantizeTicks(quantize: QuantizeValue, ticksPerBeat: number = TICKS_PER_BEAT): number {
  if (quantize === "off") return 1;
  if (quantize === "triplet-8") return Math.round(ticksPerBeat / 3);
  if (quantize === "triplet-16") return Math.round(ticksPerBeat / 6);

  // Regular quantization: 4 = quarter note, 8 = eighth, etc.
  return Math.round((ticksPerBeat * 4) / quantize);
}

/**
 * Quantize a tick value to the nearest grid position
 */
export function quantizeTick(tick: number, quantize: QuantizeValue, ticksPerBeat: number = TICKS_PER_BEAT): number {
  const quantizeTicks = getQuantizeTicks(quantize, ticksPerBeat);
  return Math.round(tick / quantizeTicks) * quantizeTicks;
}

/**
 * Convert ticks to pixels based on view settings
 */
export function ticksToPixels(ticks: number, pixelsPerBeat: number, ticksPerBeat: number = TICKS_PER_BEAT): number {
  return (ticks / ticksPerBeat) * pixelsPerBeat;
}

/**
 * Convert pixels to ticks based on view settings
 */
export function pixelsToTicks(pixels: number, pixelsPerBeat: number, ticksPerBeat: number = TICKS_PER_BEAT): number {
  return (pixels / pixelsPerBeat) * ticksPerBeat;
}

/**
 * Convert note number to Y position in the grid
 */
export function noteToY(note: number, highNote: number, pixelsPerRow: number): number {
  return (highNote - note) * pixelsPerRow;
}

/**
 * Convert Y position to note number
 */
export function yToNote(y: number, highNote: number, pixelsPerRow: number): number {
  return highNote - Math.floor(y / pixelsPerRow);
}

/**
 * Create a new MIDI note
 */
export function createMIDINote(
  pitch: number,
  startTick: number,
  duration: number = TICKS_PER_BEAT,
  velocity: number = 100
): MIDINote {
  return {
    id: generateId(),
    pitch,
    startTick,
    duration,
    velocity,
  };
}

/**
 * Check if a point is within a note's bounds in the editor
 */
export function isPointInNote(
  x: number,
  y: number,
  note: MIDINote,
  settings: MIDIEditorViewSettings,
  ticksPerBeat: number = TICKS_PER_BEAT
): boolean {
  const noteX = ticksToPixels(note.startTick, settings.horizontalZoom, ticksPerBeat);
  const noteWidth = ticksToPixels(note.duration, settings.horizontalZoom, ticksPerBeat);
  const noteY = noteToY(note.pitch, settings.noteRange.high, settings.verticalZoom);
  const noteHeight = settings.verticalZoom;

  return x >= noteX && x <= noteX + noteWidth && y >= noteY && y <= noteY + noteHeight;
}

/**
 * Get notes within a selection rectangle
 */
export function getNotesInRect(
  notes: MIDINote[],
  rect: { x1: number; y1: number; x2: number; y2: number },
  settings: MIDIEditorViewSettings,
  ticksPerBeat: number = TICKS_PER_BEAT
): MIDINote[] {
  const minX = Math.min(rect.x1, rect.x2);
  const maxX = Math.max(rect.x1, rect.x2);
  const minY = Math.min(rect.y1, rect.y2);
  const maxY = Math.max(rect.y1, rect.y2);

  return notes.filter((note) => {
    const noteX = ticksToPixels(note.startTick, settings.horizontalZoom, ticksPerBeat);
    const noteWidth = ticksToPixels(note.duration, settings.horizontalZoom, ticksPerBeat);
    const noteY = noteToY(note.pitch, settings.noteRange.high, settings.verticalZoom);
    const noteHeight = settings.verticalZoom;

    // Check if note rectangle intersects with selection rectangle
    return noteX < maxX && noteX + noteWidth > minX && noteY < maxY && noteY + noteHeight > minY;
  });
}

/**
 * Sort notes by start time, then by pitch
 */
export function sortNotes(notes: MIDINote[]): MIDINote[] {
  return [...notes].sort((a, b) => {
    if (a.startTick !== b.startTick) return a.startTick - b.startTick;
    return a.pitch - b.pitch;
  });
}

/**
 * Get the total duration of a pattern in ticks
 */
export function getPatternDurationTicks(bars: number, ticksPerBeat: number = TICKS_PER_BEAT): number {
  return bars * 4 * ticksPerBeat; // 4 beats per bar
}

/**
 * Convert time in seconds to ticks
 */
export function secondsToTicks(seconds: number, bpm: number, ticksPerBeat: number = TICKS_PER_BEAT): number {
  const beatsPerSecond = bpm / 60;
  return seconds * beatsPerSecond * ticksPerBeat;
}

/**
 * Convert ticks to time in seconds
 */
export function ticksToSeconds(ticks: number, bpm: number, ticksPerBeat: number = TICKS_PER_BEAT): number {
  const beatsPerSecond = bpm / 60;
  return ticks / (beatsPerSecond * ticksPerBeat);
}

/**
 * Format a tick position as bar:beat:tick
 */
export function formatTickPosition(tick: number, ticksPerBeat: number = TICKS_PER_BEAT): string {
  const totalBeats = tick / ticksPerBeat;
  const bar = Math.floor(totalBeats / 4) + 1;
  const beat = Math.floor(totalBeats % 4) + 1;
  const subTick = Math.round(tick % ticksPerBeat);
  return `${bar}:${beat}:${subTick.toString().padStart(3, "0")}`;
}

/**
 * Quantize options with labels
 */
export const QUANTIZE_OPTIONS: { value: QuantizeValue; label: string }[] = [
  { value: 1, label: "1 (Whole)" },
  { value: 2, label: "1/2" },
  { value: 4, label: "1/4" },
  { value: 8, label: "1/8" },
  { value: 16, label: "1/16" },
  { value: 32, label: "1/32" },
  { value: "triplet-8", label: "1/8T" },
  { value: "triplet-16", label: "1/16T" },
  { value: "off", label: "Off" },
];

/**
 * Velocity presets
 */
export const VELOCITY_PRESETS = {
  ppp: 16,
  pp: 32,
  p: 48,
  mp: 64,
  mf: 80,
  f: 96,
  ff: 112,
  fff: 127,
};

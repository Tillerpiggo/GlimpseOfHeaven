/**
 * Rhythm and pattern data types for the orbital circles sequencer
 */

import type { ChannelState, PatternLengths, RowType, InstrumentType, EffectRowType, RowConfig } from "./sequencer";
import type { SynthSettings } from "./synthSettings";

/**
 * A Pattern contains all the sequencer data for one "section" of a song
 */
/**
 * Effect pattern lengths (for effect rows)
 */
export type EffectPatternLengths = Record<EffectRowType, number>;

/**
 * Effect subdivisions (for effect rows)
 */
export type EffectSubdivisions = Record<EffectRowType, number>;

/**
 * Visual settings for a pattern (how the instrument looks)
 */
export type PatternVisualSettings = {
  orbitRadius: number;
  circleRadius: number;
  dotSize: number;
  numCircles: number;
  circleSpacing: number;
  growthRate: number;
  tiltAmount: number;
};

export type PatternData = {
  id: string;
  name: string;
  bars: number; // Length in bars (default 4)
  instrument: InstrumentType; // Which instrument this pattern uses
  // Instrument patterns (all boolean - true = toggle/hit)
  directionPattern: boolean[];
  circles1VisiblePattern: boolean[];
  circles2VisiblePattern: boolean[];
  circles1PositionPattern: boolean[];
  circles2PositionPattern: boolean[];
  circlesGrowthPattern: boolean[];
  tilt3DPattern: boolean[];
  // Effect patterns
  rotationEnabledPattern: boolean[];
  rotationDirectionPattern: boolean[];
  flipYPattern: boolean[];
  // Subdivisions (playback speed)
  subdivisions: Record<RowType, number>;
  effectSubdivisions: EffectSubdivisions;
  // Pattern lengths
  patternLengths: PatternLengths;
  effectPatternLengths: EffectPatternLengths;
  // Visible rows configuration (which rows are shown and their order)
  visibleRows?: RowConfig[];
  // Visual settings for this pattern
  visualSettings?: PatternVisualSettings;
};

/**
 * An arrangement clip is a reference to a pattern at a specific position in the timeline
 */
export type ArrangementClip = {
  id: string;
  patternId: string;
  startBar: number; // Which bar does this clip start at
  length: number; // How many bars (can differ from pattern.bars for looping/truncating)
  stack: number; // Which stack (0-indexed) this clip is on - multiple clips can be on same stack
};

/**
 * Settings for a stack - controls how instruments on this stack are rendered
 */
export type StackSettings = {
  flipY: boolean; // Mirror over Y axis
  scale: number; // Size multiplier (1 = normal)
  offsetX: number; // Horizontal offset in pixels
  offsetY: number; // Vertical offset in pixels
  opacity: number; // Opacity (0-1)
  rotation: number; // Additional rotation in degrees
};

/**
 * Complete rhythm data including all settings, patterns, and arrangement
 */
export type RhythmData = {
  id: string;
  name: string;
  createdAt: number;
  // Global Settings
  orbitRadius: number;
  bpm: number;
  circleRadius: number;
  dotSize: number;
  numCircles: number;
  circleSpacing: number;
  // Growth rate (circles per revolution)
  growthRate: number;
  // Tilt amount (max tilt angle in degrees)
  tiltAmount: number;
  // Channel states (applies to all patterns)
  channelStates: Record<string, ChannelState>;
  // Pattern library
  patterns: PatternData[];
  // Arrangement timeline
  arrangement: ArrangementClip[];
  // Stack settings (indexed by stack number)
  stackSettings?: Record<number, StackSettings>;
  // Synth visual settings
  synthSettings?: SynthSettings;
  // --- Legacy fields for backwards compatibility ---
  // These are only used when loading old saved rhythms
  directionPattern?: boolean[];
  circles1VisiblePattern?: boolean[];
  circles2VisiblePattern?: boolean[];
  circles1PositionPattern?: boolean[];
  circles2PositionPattern?: boolean[];
  circlesGrowthPattern?: boolean[];
  tilt3DPattern?: boolean[];
  subdivisions?: Record<RowType, number>;
  patternLengths?: PatternLengths;
};

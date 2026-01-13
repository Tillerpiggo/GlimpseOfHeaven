/**
 * Rhythm and pattern data types for the orbital circles sequencer
 */

import type { ChannelState, PatternLengths, RowType } from "./sequencer";

/**
 * A Pattern contains all the sequencer data for one "section" of a song
 */
export type PatternData = {
  id: string;
  name: string;
  bars: number; // Length in bars (default 4)
  // Patterns (all boolean - true = toggle/hit)
  directionPattern: boolean[];
  circles1VisiblePattern: boolean[];
  circles2VisiblePattern: boolean[];
  circles1PositionPattern: boolean[];
  circles2PositionPattern: boolean[];
  circlesGrowthPattern: boolean[];
  tilt3DPattern: boolean[];
  // Subdivisions (playback speed)
  subdivisions: Record<RowType, number>;
  // Pattern lengths
  patternLengths: PatternLengths;
};

/**
 * An arrangement clip is a reference to a pattern at a specific position in the timeline
 */
export type ArrangementClip = {
  id: string;
  patternId: string;
  startBar: number; // Which bar does this clip start at
  length: number; // How many bars (can differ from pattern.bars for looping/truncating)
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

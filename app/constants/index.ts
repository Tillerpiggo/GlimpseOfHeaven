/**
 * Constants for the orbital circles application
 */

import type { RowType, RowTypeInfo, PatternLengths, Subdivisions, ChannelState, PatternData, RhythmData, ArrangementClip, InstrumentType, InstrumentInfo, EffectType, EffectInfo, EffectRowType, EffectPatternLengths, EffectSubdivisions } from "@/types";
import { generateId } from "@/utils/id";

/**
 * Instrument type metadata for display
 */
export const INSTRUMENT_INFO: Record<InstrumentType, InstrumentInfo> = {
  orbital: {
    label: "Orbital",
    description: "Two dots orbiting with concentric circles around each",
  },
  concentric: {
    label: "Concentric",
    description: "Expanding circles from center with reversible direction",
  },
};

/**
 * Effect type metadata for display
 */
export const EFFECT_INFO: Record<EffectType, EffectInfo> = {
  rotation: {
    label: "Rotation",
    description: "Rotates the entire instrument around the center",
    rows: ["rotationEnabled", "rotationDirection"],
  },
};

/**
 * Effect row type metadata for display
 */
export const EFFECT_ROW_TYPE_INFO: Record<EffectRowType, RowTypeInfo> = {
  rotationEnabled: {
    label: "Rot On",
    hitSymbol: "⟳",
    hitColor: "bg-violet-600 hover:bg-violet-500",
    description: "Toggle rotation effect on/off",
  },
  rotationDirection: {
    label: "Rot Dir",
    hitSymbol: "↻",
    hitColor: "bg-violet-600 hover:bg-violet-500",
    description: "Toggle rotation direction",
  },
  flipY: {
    label: "Flip Y",
    hitSymbol: "⇿",
    hitColor: "bg-pink-600 hover:bg-pink-500",
    description: "Mirror instrument over Y axis",
  },
};

/**
 * Default effect pattern lengths
 */
export const DEFAULT_EFFECT_PATTERN_LENGTHS: EffectPatternLengths = {
  rotationEnabled: 16,
  rotationDirection: 16,
  flipY: 16,
};

/**
 * Default effect subdivisions
 */
export const DEFAULT_EFFECT_SUBDIVISIONS: EffectSubdivisions = {
  rotationEnabled: 1,
  rotationDirection: 1,
  flipY: 1,
};

/**
 * All effect row types in order
 */
export const ALL_EFFECT_ROW_TYPES: EffectRowType[] = [
  "rotationEnabled",
  "rotationDirection",
  "flipY",
];

/**
 * Row type metadata for display
 */
export const ROW_TYPE_INFO: Record<RowType, RowTypeInfo> = {
  direction: {
    label: "Direction",
    hitSymbol: "↺",
    hitColor: "bg-cyan-600 hover:bg-cyan-500",
    description: "Reverse orbit direction",
  },
  circles1Visible: {
    label: "C1 Vis",
    hitSymbol: "●",
    hitColor: "bg-blue-600 hover:bg-blue-500",
    description: "Toggle circle set 1 visibility",
  },
  circles2Visible: {
    label: "C2 Vis",
    hitSymbol: "●",
    hitColor: "bg-blue-600 hover:bg-blue-500",
    description: "Toggle circle set 2 visibility",
  },
  circles1Position: {
    label: "C1 Pos",
    hitSymbol: "⇄",
    hitColor: "bg-orange-600 hover:bg-orange-500",
    description: "Toggle circle set 1 position",
  },
  circles2Position: {
    label: "C2 Pos",
    hitSymbol: "⇄",
    hitColor: "bg-orange-600 hover:bg-orange-500",
    description: "Toggle circle set 2 position",
  },
  circlesGrowth: {
    label: "Growth",
    hitSymbol: "↗",
    hitColor: "bg-green-600 hover:bg-green-500",
    description: "Toggle expanding circles",
  },
  tilt3D: {
    label: "3D Rotate",
    hitSymbol: "◇",
    hitColor: "bg-pink-600 hover:bg-pink-500",
    description: "Toggle 3D rotation",
  },
};

/**
 * Default pattern lengths for each row
 */
export const DEFAULT_PATTERN_LENGTHS: PatternLengths = {
  direction: 16,
  circles1Visible: 16,
  circles2Visible: 16,
  circles1Position: 16,
  circles2Position: 16,
  circlesGrowth: 16,
  tilt3D: 16,
};

/**
 * Default subdivisions for each row
 */
export const DEFAULT_SUBDIVISIONS: Subdivisions = {
  direction: 1,
  circles1Visible: 1,
  circles2Visible: 1,
  circles1Position: 1,
  circles2Position: 1,
  circlesGrowth: 1,
  tilt3D: 1,
};

/**
 * Default channel states (all unmuted, no solo)
 */
export const DEFAULT_CHANNEL_STATES: Record<string, ChannelState> = {
  direction: { mute: false, solo: false },
  circles1Visible: { mute: false, solo: false },
  circles2Visible: { mute: false, solo: false },
  circles1Position: { mute: false, solo: false },
  circles2Position: { mute: false, solo: false },
  circlesGrowth: { mute: false, solo: false },
  tilt3D: { mute: false, solo: false },
};

/**
 * Subdivision options for the sequencer
 */
export const SUBDIVISION_OPTIONS = [0.25, 0.5, 1, 2, 4] as const;

/**
 * Pattern length options for the sequencer
 */
export const PATTERN_LENGTH_OPTIONS = [4, 8, 16, 32, 64] as const;

/**
 * Base pattern length (16 steps = 8 rotations at 1x)
 */
export const BASE_PATTERN_LENGTH = 16;

/**
 * Default visualization settings
 */
export const DEFAULT_VISUALIZATION = {
  orbitRadius: 250,
  bpm: 76,
  circleRadius: 150,
  dotSize: 16,
  numCircles: 12,
  circleSpacing: 100,
  growthRate: 1,
  tiltAmount: 45,
} as const;

/**
 * Animation constants
 */
export const ANIMATION = {
  HALF_ROTATION: Math.PI,
  PERSPECTIVE_DISTANCE: 1000,
  MIN_CIRCLE_SCALE: 0.3,
  MIN_CIRCLE_RADIUS: 10,
} as const;

/**
 * Create a default pattern with all settings
 */
export const createDefaultPattern = (name: string = "Pattern 1", instrument: InstrumentType = "orbital"): PatternData => ({
  id: generateId(),
  name,
  bars: 4,
  instrument,
  directionPattern: Array(16).fill(false),
  circles1VisiblePattern: Array(16).fill(true),
  circles2VisiblePattern: Array(16).fill(true),
  circles1PositionPattern: Array(16).fill(false),
  circles2PositionPattern: Array(16).fill(false),
  circlesGrowthPattern: Array(16).fill(false),
  tilt3DPattern: Array(16).fill(false),
  rotationEnabledPattern: Array(16).fill(false),
  rotationDirectionPattern: Array(16).fill(false),
  flipYPattern: Array(16).fill(false),
  subdivisions: { ...DEFAULT_SUBDIVISIONS },
  effectSubdivisions: { ...DEFAULT_EFFECT_SUBDIVISIONS },
  patternLengths: { ...DEFAULT_PATTERN_LENGTHS },
  effectPatternLengths: { ...DEFAULT_EFFECT_PATTERN_LENGTHS },
});

/**
 * Helper to create a default beat with the new structure
 */
type BeatConfig = {
  name: string;
  orbitRadius: number;
  bpm: number;
  circleRadius: number;
  dotSize: number;
  numCircles: number;
  circleSpacing: number;
  growthRate: number;
  tiltAmount: number;
  channelStates: Record<string, ChannelState>;
  pattern: Omit<PatternData, "id">;
};

const createDefaultBeat = (config: BeatConfig): Omit<RhythmData, "id" | "createdAt"> => {
  const patternId = generateId();
  const patternWithEffects = {
    ...config.pattern,
    id: patternId,
    rotationEnabledPattern: config.pattern.rotationEnabledPattern || Array(16).fill(false),
    rotationDirectionPattern: config.pattern.rotationDirectionPattern || Array(16).fill(false),
    flipYPattern: config.pattern.flipYPattern || Array(16).fill(false),
    effectSubdivisions: config.pattern.effectSubdivisions || { ...DEFAULT_EFFECT_SUBDIVISIONS },
    effectPatternLengths: config.pattern.effectPatternLengths || { ...DEFAULT_EFFECT_PATTERN_LENGTHS },
  };
  return {
    name: config.name,
    orbitRadius: config.orbitRadius,
    bpm: config.bpm,
    circleRadius: config.circleRadius,
    dotSize: config.dotSize,
    numCircles: config.numCircles,
    circleSpacing: config.circleSpacing,
    growthRate: config.growthRate,
    tiltAmount: config.tiltAmount,
    channelStates: config.channelStates,
    patterns: [patternWithEffects],
    arrangement: [{ id: generateId(), patternId, startBar: 0, length: config.pattern.bars, stack: 0 }],
  };
};

/**
 * Default preset beats
 */
export const DEFAULT_BEATS: Omit<RhythmData, "id" | "createdAt">[] = [
  createDefaultBeat({
    name: "Hypnotic Pulse",
    orbitRadius: 250,
    bpm: 76,
    circleRadius: 150,
    dotSize: 16,
    numCircles: 12,
    circleSpacing: 100,
    growthRate: 1,
    tiltAmount: 45,
    channelStates: { ...DEFAULT_CHANNEL_STATES },
    pattern: {
      name: "Main",
      bars: 4,
      instrument: "orbital",
      directionPattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      circles1VisiblePattern: Array(16).fill(true),
      circles2VisiblePattern: [false, false, false, false, false, false, false, false, true, true, true, true, true, true, true, true],
      circles1PositionPattern: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      circles2PositionPattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      circlesGrowthPattern: Array(16).fill(false),
      tilt3DPattern: Array(16).fill(false),
      rotationEnabledPattern: Array(16).fill(false),
      rotationDirectionPattern: Array(16).fill(false),
      flipYPattern: Array(16).fill(false),
      subdivisions: { ...DEFAULT_SUBDIVISIONS },
      effectSubdivisions: { ...DEFAULT_EFFECT_SUBDIVISIONS },
      patternLengths: { ...DEFAULT_PATTERN_LENGTHS },
      effectPatternLengths: { ...DEFAULT_EFFECT_PATTERN_LENGTHS },
    },
  }),
  createDefaultBeat({
    name: "Breathing Cosmos",
    orbitRadius: 200,
    bpm: 60,
    circleRadius: 120,
    dotSize: 20,
    numCircles: 15,
    circleSpacing: 80,
    growthRate: 1,
    tiltAmount: 30,
    channelStates: { ...DEFAULT_CHANNEL_STATES },
    pattern: {
      name: "Main",
      bars: 4,
      instrument: "orbital",
      directionPattern: [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
      circles1VisiblePattern: Array(16).fill(true),
      circles2VisiblePattern: Array(16).fill(true),
      circles1PositionPattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      circles2PositionPattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      circlesGrowthPattern: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      tilt3DPattern: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      rotationEnabledPattern: Array(16).fill(false),
      rotationDirectionPattern: Array(16).fill(false),
      flipYPattern: Array(16).fill(false),
      subdivisions: { ...DEFAULT_SUBDIVISIONS },
      effectSubdivisions: { ...DEFAULT_EFFECT_SUBDIVISIONS },
      patternLengths: { ...DEFAULT_PATTERN_LENGTHS },
      effectPatternLengths: { ...DEFAULT_EFFECT_PATTERN_LENGTHS },
    },
  }),
  createDefaultBeat({
    name: "Glitch Storm",
    orbitRadius: 180,
    bpm: 140,
    circleRadius: 100,
    dotSize: 12,
    numCircles: 20,
    circleSpacing: 60,
    growthRate: 2,
    tiltAmount: 60,
    channelStates: { ...DEFAULT_CHANNEL_STATES },
    pattern: {
      name: "Main",
      bars: 4,
      instrument: "orbital",
      directionPattern: [true, false, true, false, false, true, false, false, true, false, false, true, false, true, false, false],
      circles1VisiblePattern: [true, true, false, true, true, false, true, true, false, true, true, false, true, true, false, true],
      circles2VisiblePattern: [false, true, true, false, true, true, false, true, true, false, true, true, false, true, true, false],
      circles1PositionPattern: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      circles2PositionPattern: [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true],
      circlesGrowthPattern: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      tilt3DPattern: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      rotationEnabledPattern: Array(16).fill(false),
      rotationDirectionPattern: Array(16).fill(false),
      flipYPattern: Array(16).fill(false),
      subdivisions: { direction: 2, circles1Visible: 2, circles2Visible: 2, circles1Position: 2, circles2Position: 2, circlesGrowth: 1, tilt3D: 2 },
      effectSubdivisions: { ...DEFAULT_EFFECT_SUBDIVISIONS },
      patternLengths: { ...DEFAULT_PATTERN_LENGTHS },
      effectPatternLengths: { ...DEFAULT_EFFECT_PATTERN_LENGTHS },
    },
  }),
  createDefaultBeat({
    name: "Zen Garden",
    orbitRadius: 300,
    bpm: 45,
    circleRadius: 200,
    dotSize: 24,
    numCircles: 8,
    circleSpacing: 150,
    growthRate: 0.5,
    tiltAmount: 20,
    channelStates: {
      ...DEFAULT_CHANNEL_STATES,
      circles2Visible: { mute: true, solo: false },
      circles2Position: { mute: true, solo: false },
    },
    pattern: {
      name: "Main",
      bars: 4,
      instrument: "orbital",
      directionPattern: Array(16).fill(false),
      circles1VisiblePattern: Array(16).fill(true),
      circles2VisiblePattern: Array(16).fill(false),
      circles1PositionPattern: [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
      circles2PositionPattern: Array(16).fill(false),
      circlesGrowthPattern: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      tilt3DPattern: Array(16).fill(false),
      rotationEnabledPattern: Array(16).fill(false),
      rotationDirectionPattern: Array(16).fill(false),
      flipYPattern: Array(16).fill(false),
      subdivisions: { ...DEFAULT_SUBDIVISIONS },
      effectSubdivisions: { ...DEFAULT_EFFECT_SUBDIVISIONS },
      patternLengths: { ...DEFAULT_PATTERN_LENGTHS },
      effectPatternLengths: { ...DEFAULT_EFFECT_PATTERN_LENGTHS },
    },
  }),
  createDefaultBeat({
    name: "Techno Orbit",
    orbitRadius: 220,
    bpm: 128,
    circleRadius: 130,
    dotSize: 14,
    numCircles: 16,
    circleSpacing: 70,
    growthRate: 1,
    tiltAmount: 45,
    channelStates: { ...DEFAULT_CHANNEL_STATES },
    pattern: {
      name: "Main",
      bars: 4,
      instrument: "orbital",
      directionPattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      circles1VisiblePattern: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      circles2VisiblePattern: [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true],
      circles1PositionPattern: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      circles2PositionPattern: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      circlesGrowthPattern: Array(16).fill(false),
      tilt3DPattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      rotationEnabledPattern: Array(16).fill(false),
      rotationDirectionPattern: Array(16).fill(false),
      flipYPattern: Array(16).fill(false),
      subdivisions: { direction: 1, circles1Visible: 2, circles2Visible: 2, circles1Position: 1, circles2Position: 1, circlesGrowth: 1, tilt3D: 1 },
      effectSubdivisions: { ...DEFAULT_EFFECT_SUBDIVISIONS },
      patternLengths: { ...DEFAULT_PATTERN_LENGTHS },
      effectPatternLengths: { ...DEFAULT_EFFECT_PATTERN_LENGTHS },
    },
  }),
];

/**
 * All row types in order
 */
export const ALL_ROW_TYPES: RowType[] = [
  "direction",
  "circles1Visible",
  "circles2Visible",
  "circles1Position",
  "circles2Position",
  "circlesGrowth",
  "tilt3D",
];

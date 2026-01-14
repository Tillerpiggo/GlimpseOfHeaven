/**
 * Sequencer-related types for the drum machine interface
 */

/**
 * State for drag operations on pattern cells
 */
export type DragState = {
  row: string;
  value: boolean;
} | null;

/**
 * Mute/Solo state for a channel
 */
export type ChannelState = {
  mute: boolean;
  solo: boolean;
};

/**
 * Available row types for the sequencer
 */
export type RowType =
  | "direction"
  | "circles1Visible"
  | "circles2Visible"
  | "circles1Position"
  | "circles2Position"
  | "circlesGrowth"
  | "tilt3D";

/**
 * Row configuration for display in the sequencer
 */
export type RowConfig = {
  id: string;
  type: RowType;
  isEffect?: false;
} | {
  id: string;
  type: EffectRowType;
  isEffect: true;
};

/**
 * Metadata for each row type
 */
export type RowTypeInfo = {
  label: string;
  hitSymbol: string;
  hitColor: string;
  description: string;
};

/**
 * Pattern lengths for each row type
 */
export type PatternLengths = Record<RowType, number>;

/**
 * Subdivisions for each row type
 */
export type Subdivisions = Record<RowType, number>;

/**
 * Available instrument types
 */
export type InstrumentType = "orbital" | "concentric";

/**
 * Available effect types
 */
export type EffectType = "rotation";

/**
 * Effect row types for the sequencer
 */
export type EffectRowType = "rotationEnabled" | "rotationDirection" | "flipY";

/**
 * Instrument metadata for display
 */
export type InstrumentInfo = {
  label: string;
  description: string;
};

/**
 * Effect metadata for display
 */
export type EffectInfo = {
  label: string;
  description: string;
  rows: EffectRowType[];
};

/**
 * Re-export all utilities for convenient imports
 */

export { generateId } from "./id";

export {
  getPatternIndex,
  getPassedCellCount,
  cellHasHit,
  countTogglesEfficient,
  calculateDirectionAngle,
  getPositionT,
  resizePattern,
} from "./patternCalculations";

export {
  applyPerspective,
  drawCircles,
  drawDot,
  clearCanvas,
  drawPolarShape,
  calculateOscillatedPetalCount,
  calculateOrbitOscillation,
  lerpColor,
  type PerspectiveResult,
  type CircleDrawOptions,
  type PolarRenderOptions,
  type DotDrawOptions,
} from "./canvasDrawing";

export {
  renderInstrument,
  calculateRotationEffect,
  calculateFlipYEffect,
  drawOrbitalInstrument,
  drawConcentricInstrument,
  type RenderContext,
  type InstrumentPatternState,
} from "./instrumentRendering";

export {
  TICKS_PER_BEAT,
  DEFAULT_MIDI_VIEW_SETTINGS,
  GM_DRUM_LABELS,
  getNoteName,
  isBlackKey,
  getPianoKeys,
  getQuantizeTicks,
  quantizeTick,
  ticksToPixels,
  pixelsToTicks,
  noteToY,
  yToNote,
  createMIDINote,
  isPointInNote,
  getNotesInRect,
  sortNotes,
  getPatternDurationTicks,
  secondsToTicks,
  ticksToSeconds,
  formatTickPosition,
  QUANTIZE_OPTIONS,
  VELOCITY_PRESETS,
} from "./midi";

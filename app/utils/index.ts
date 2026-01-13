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
  type PerspectiveResult,
  type CircleDrawOptions,
} from "./canvasDrawing";

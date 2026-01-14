/**
 * Instrument rendering utilities for different instrument types
 */

import { ANIMATION } from "@/constants";
import type { PatternData, InstrumentType, RowType, StackSettings } from "@/types";
import {
  getPatternIndex,
  getPassedCellCount,
  cellHasHit,
  countTogglesEfficient,
  calculateDirectionAngle,
  getPositionT,
} from "./patternCalculations";
import { applyPerspective, drawCircles, drawDot } from "./canvasDrawing";

/**
 * Rendering context passed to instrument renderers
 */
export type RenderContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  timeRef: number;
  bpm: number;
  orbitRadius: number;
  circleRadius: number;
  dotSize: number;
  numCircles: number;
  circleSpacing: number;
  growthRate: number;
  tiltAmount: number;
  isChannelActive: (channel: string) => boolean;
  // Effect state (from pattern)
  rotationAngle: number; // Applied rotation effect angle
  flipY: boolean; // Whether to flip/mirror over Y axis (from pattern)
  // Stack positioning
  stackIndex: number; // Which stack this is (0, 1, 2, ...)
  totalStacks: number; // Total number of active stacks
  // Stack settings
  stackSettings: StackSettings;
};

/**
 * Pattern state for a single instrument
 */
export type InstrumentPatternState = {
  pattern: PatternData;
  patternLengths: Record<RowType, number>;
};

/**
 * Draw concentric expanding circles from center
 */
export function drawConcentricInstrument(
  ctx: RenderContext,
  pattern: InstrumentPatternState,
  totalHalfRotations: number
): void {
  const {
    width,
    height,
    circleRadius,
    numCircles,
    circleSpacing,
    stackSettings,
  } = ctx;

  // Apply stack settings
  const stackScale = stackSettings.scale;
  const stackOffsetX = stackSettings.offsetX;
  const stackOffsetY = stackSettings.offsetY;
  const stackOpacity = stackSettings.opacity;

  // Set opacity for this stack
  ctx.ctx.globalAlpha = stackOpacity;

  // Apply scale to dimensions
  const scaledCircleRadius = circleRadius * stackScale;
  const scaledCircleSpacing = circleSpacing * stackScale;

  // Calculate center with stack offset
  const centerX = width / 2 + stackOffsetX;
  const centerY = height / 2 + stackOffsetY;

  // Note: flipY has no visible effect on concentric circles since they're symmetric

  // Get direction pattern state
  const directionPattern = pattern.pattern.directionPattern;
  const dirBaseLen = pattern.patternLengths.direction;
  const dirScaleFactor = directionPattern.length / dirBaseLen;
  const dirPassedCells = getPassedCellCount(directionPattern, totalHalfRotations, dirBaseLen);
  const halfRotsPerCell = 1 / dirScaleFactor;

  const { currentDir } = calculateDirectionAngle(
    directionPattern,
    dirPassedCells,
    halfRotsPerCell,
    ANIMATION.HALF_ROTATION,
    ctx.isChannelActive("direction")
  );

  // Calculate expansion offset based on time and direction
  const expansionSpeed = ctx.bpm / 60; // Circles per second
  const direction = currentDir ? 1 : -1;
  const baseOffset = (ctx.timeRef * expansionSpeed * scaledCircleSpacing * direction) % (numCircles * scaledCircleSpacing);

  // Ensure offset is always positive for consistent rendering
  const expansionOffset = baseOffset < 0 ? baseOffset + (numCircles * scaledCircleSpacing) : baseOffset;

  // Draw expanding circles from center
  const maxRadius = scaledCircleRadius + (numCircles - 1) * scaledCircleSpacing;

  for (let i = 1; i <= numCircles; i++) {
    let radius = scaledCircleRadius + (i - 1) * scaledCircleSpacing - expansionOffset;

    // Wrap radius
    while (radius < scaledCircleRadius * 0.5) {
      radius += numCircles * scaledCircleSpacing;
    }
    while (radius > maxRadius + scaledCircleSpacing) {
      radius -= numCircles * scaledCircleSpacing;
    }

    if (radius < scaledCircleRadius * 0.5) continue;

    const normalizedPos = (radius - scaledCircleRadius) / (maxRadius - scaledCircleRadius + scaledCircleSpacing);
    const opacity = Math.max(0.2, 1 - normalizedPos * 0.7) * stackOpacity;

    ctx.ctx.beginPath();
    ctx.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.ctx.lineWidth = 2 * stackScale;
    ctx.ctx.stroke();
  }

  // Reset opacity
  ctx.ctx.globalAlpha = 1;
}

/**
 * Draw orbital instrument (two dots with circles around each)
 * This is the original/default instrument with growth and 3D removed
 */
export function drawOrbitalInstrument(
  ctx: RenderContext,
  pattern: InstrumentPatternState,
  totalHalfRotations: number
): void {
  const {
    width,
    height,
    orbitRadius,
    circleRadius,
    dotSize,
    numCircles,
    circleSpacing,
    isChannelActive,
    rotationAngle,
    flipY,
    stackSettings,
  } = ctx;

  // Apply stack settings
  const stackScale = stackSettings.scale;
  const stackOffsetX = stackSettings.offsetX;
  const stackOffsetY = stackSettings.offsetY;
  const stackOpacity = stackSettings.opacity;
  const stackRotation = (stackSettings.rotation * Math.PI) / 180; // Convert to radians
  const stackFlipY = stackSettings.flipY;

  // Set opacity for this stack
  ctx.ctx.globalAlpha = stackOpacity;

  // Calculate center with stack offset
  const stackCenterX = width / 2 + stackOffsetX;
  const stackCenterY = height / 2 + stackOffsetY;

  // Apply scale to dimensions
  const scaledOrbitRadius = orbitRadius * stackScale;
  const scaledCircleRadius = circleRadius * stackScale;
  const scaledDotSize = dotSize * stackScale;
  const scaledCircleSpacing = circleSpacing * stackScale;

  // Flip multiplier for Y-axis mirroring (XOR pattern flipY with stack flipY)
  const effectiveFlipY = flipY !== stackFlipY; // XOR: true if exactly one is true
  const flipMultiplier = effectiveFlipY ? -1 : 1;

  // Direction calculation
  const directionPattern = pattern.pattern.directionPattern;
  const dirBaseLen = pattern.patternLengths.direction;
  const dirScaleFactor = directionPattern.length / dirBaseLen;
  const dirPassedCells = getPassedCellCount(directionPattern, totalHalfRotations, dirBaseLen);
  const dirCurrentCell = dirPassedCells % directionPattern.length;
  const dirCellProgress = (totalHalfRotations * dirScaleFactor) % 1;
  const halfRotsPerCell = 1 / dirScaleFactor;
  const halfRotation = ANIMATION.HALF_ROTATION;

  const directionActive = isChannelActive("direction");
  const { angle: baseAngleCalc, currentDir } = calculateDirectionAngle(
    directionPattern,
    dirPassedCells,
    halfRotsPerCell,
    halfRotation,
    directionActive
  );

  let currentDirection = currentDir;
  if (directionActive && cellHasHit(directionPattern, dirCurrentCell)) {
    currentDirection = !currentDirection;
  }
  const angle = baseAngleCalc + (currentDirection ? dirCellProgress * halfRotsPerCell * halfRotation : -dirCellProgress * halfRotsPerCell * halfRotation);

  // Apply rotation effect and stack rotation
  const effectiveAngle = angle + rotationAngle + stackRotation;

  // Apply flipY to X coordinate (mirror over Y axis) and use scaled orbit radius
  const orbitingX = Math.cos(effectiveAngle) * scaledOrbitRadius * flipMultiplier;
  const orbitingY = Math.sin(effectiveAngle) * scaledOrbitRadius;
  const midpointX = orbitingX / 2;
  const midpointY = orbitingY / 2;
  const cameraX = stackCenterX - midpointX;
  const cameraY = stackCenterY - midpointY;

  const dot1ScreenX = cameraX;
  const dot1ScreenY = cameraY;
  const dot2ScreenX = cameraX + orbitingX;
  const dot2ScreenY = cameraY + orbitingY;

  // Visibility
  const circles1VisActive = isChannelActive("circles1Visible");
  const circles2VisActive = isChannelActive("circles2Visible");
  const { idx: c1VisIdx } = getPatternIndex(pattern.pattern.circles1VisiblePattern, totalHalfRotations, pattern.patternLengths.circles1Visible);
  const { idx: c2VisIdx } = getPatternIndex(pattern.pattern.circles2VisiblePattern, totalHalfRotations, pattern.patternLengths.circles2Visible);
  const circles1Visible = circles1VisActive ? pattern.pattern.circles1VisiblePattern[c1VisIdx] : true;
  const circles2Visible = circles2VisActive ? pattern.pattern.circles2VisiblePattern[c2VisIdx] : true;

  // Position
  const circles1PosActive = isChannelActive("circles1Position");
  const circles2PosActive = isChannelActive("circles2Position");
  const circles1T = getPositionT(pattern.pattern.circles1PositionPattern, totalHalfRotations, pattern.patternLengths.circles1Position, circles1PosActive);
  const circles2T = getPositionT(pattern.pattern.circles2PositionPattern, totalHalfRotations, pattern.patternLengths.circles2Position, circles2PosActive);

  // No growth or tilt in the simplified orbital instrument
  const growthEnabled = false;
  const growthOffset = 0;
  const tiltEnabled = false;
  const currentTiltAngle = 0;
  const axisAngle = effectiveAngle;

  // Draw circles 1
  if (circles1Visible) {
    const center1X = dot1ScreenX + (stackCenterX - dot1ScreenX) * circles1T;
    const center1Y = dot1ScreenY + (stackCenterY - dot1ScreenY) * circles1T;
    const baseRadius1 = scaledCircleRadius + (scaledOrbitRadius / 2 - scaledCircleRadius) * circles1T;
    const p1 = applyPerspective(center1X, center1Y, stackCenterX, stackCenterY, tiltEnabled, axisAngle, currentTiltAngle);
    drawCircles({
      ctx: ctx.ctx,
      centerX: center1X,
      centerY: center1Y,
      baseRadius: baseRadius1,
      numCircles,
      circleSpacing: scaledCircleSpacing,
      growthEnabled,
      growthOffset,
      tiltEnabled,
      currentTiltAngle,
      axisAngle,
      perspective: p1,
      canvasWidth: width,
      canvasHeight: height,
    });
  }

  // Draw circles 2
  if (circles2Visible) {
    const center2X = dot2ScreenX + (stackCenterX - dot2ScreenX) * circles2T;
    const center2Y = dot2ScreenY + (stackCenterY - dot2ScreenY) * circles2T;
    const baseRadius2 = scaledCircleRadius + (scaledOrbitRadius / 2 - scaledCircleRadius) * circles2T;
    const p2 = applyPerspective(center2X, center2Y, stackCenterX, stackCenterY, tiltEnabled, axisAngle, currentTiltAngle);
    drawCircles({
      ctx: ctx.ctx,
      centerX: center2X,
      centerY: center2Y,
      baseRadius: baseRadius2,
      numCircles,
      circleSpacing: scaledCircleSpacing,
      growthEnabled,
      growthOffset,
      tiltEnabled,
      currentTiltAngle,
      axisAngle,
      perspective: p2,
      canvasWidth: width,
      canvasHeight: height,
    });
  }

  // Draw dots
  const dot1P = applyPerspective(dot1ScreenX, dot1ScreenY, stackCenterX, stackCenterY, tiltEnabled, axisAngle, currentTiltAngle);
  const dot2P = applyPerspective(dot2ScreenX, dot2ScreenY, stackCenterX, stackCenterY, tiltEnabled, axisAngle, currentTiltAngle);
  drawDot(ctx.ctx, dot1ScreenX, dot1ScreenY, scaledDotSize, dot1P, tiltEnabled);
  drawDot(ctx.ctx, dot2ScreenX, dot2ScreenY, scaledDotSize, dot2P, tiltEnabled);

  // Reset opacity
  ctx.ctx.globalAlpha = 1;
}

/**
 * Main function to render an instrument based on its type
 */
export function renderInstrument(
  instrumentType: InstrumentType,
  ctx: RenderContext,
  pattern: InstrumentPatternState,
  totalHalfRotations: number
): void {
  switch (instrumentType) {
    case "orbital":
      drawOrbitalInstrument(ctx, pattern, totalHalfRotations);
      break;
    case "concentric":
      drawConcentricInstrument(ctx, pattern, totalHalfRotations);
      break;
    default:
      drawOrbitalInstrument(ctx, pattern, totalHalfRotations);
  }
}

/**
 * Calculate rotation effect state from patterns
 */
export function calculateRotationEffect(
  rotationEnabledPattern: boolean[],
  rotationDirectionPattern: boolean[],
  totalHalfRotations: number,
  baseLength: number = 16,
  isActive: boolean = true
): { enabled: boolean; angle: number } {
  if (!isActive) {
    return { enabled: false, angle: 0 };
  }

  const passedCells = getPassedCellCount(rotationEnabledPattern, totalHalfRotations, baseLength);
  const toggleCount = countTogglesEfficient(rotationEnabledPattern, passedCells);
  const enabled = toggleCount % 2 === 1;

  if (!enabled) {
    return { enabled: false, angle: 0 };
  }

  // Calculate rotation direction
  const dirPassedCells = getPassedCellCount(rotationDirectionPattern, totalHalfRotations, baseLength);
  const dirToggleCount = countTogglesEfficient(rotationDirectionPattern, dirPassedCells);
  const clockwise = dirToggleCount % 2 === 0;

  // Calculate rotation angle based on time
  const rotationSpeed = ANIMATION.HALF_ROTATION / 4; // One full rotation per 4 half-rotations
  const angle = totalHalfRotations * rotationSpeed * (clockwise ? 1 : -1);

  return { enabled, angle };
}

/**
 * Calculate flipY effect state from pattern
 */
export function calculateFlipYEffect(
  flipYPattern: boolean[],
  totalHalfRotations: number,
  baseLength: number = 16,
  isActive: boolean = true
): boolean {
  if (!isActive) {
    return false;
  }

  const passedCells = getPassedCellCount(flipYPattern, totalHalfRotations, baseLength);
  const toggleCount = countTogglesEfficient(flipYPattern, passedCells);
  return toggleCount % 2 === 1;
}

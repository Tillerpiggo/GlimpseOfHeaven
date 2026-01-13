/**
 * Canvas drawing utilities for the orbital visualization
 */

import { ANIMATION } from "@/constants";

/**
 * Perspective transformation result
 */
export type PerspectiveResult = {
  x: number;
  y: number;
  scale: number;
};

/**
 * Apply 3D perspective rotating around the dot-dot axis
 */
export function applyPerspective(
  x: number,
  y: number,
  pivotX: number,
  pivotY: number,
  tiltEnabled: boolean,
  axisAngle: number,
  currentTiltAngle: number
): PerspectiveResult {
  if (!tiltEnabled) {
    return { x, y, scale: 1 };
  }

  // Translate to pivot point
  const relX = x - pivotX;
  const relY = y - pivotY;

  // Rotate coordinate system to align with axis (perpendicular becomes the rotation plane)
  const perpX = relX * Math.cos(-axisAngle) - relY * Math.sin(-axisAngle);
  const alongAxis = relX * Math.sin(-axisAngle) + relY * Math.cos(-axisAngle);

  // Apply 3D rotation around the axis (perpendicular component rotates into Z)
  const rotatedPerpX = perpX * Math.cos(currentTiltAngle);
  const depth = perpX * Math.sin(currentTiltAngle);

  // Apply perspective
  const scale = ANIMATION.PERSPECTIVE_DISTANCE / (ANIMATION.PERSPECTIVE_DISTANCE + depth);

  // Rotate back to screen coordinates
  const newRelX = rotatedPerpX * Math.cos(axisAngle) - alongAxis * Math.sin(axisAngle);
  const newRelY = rotatedPerpX * Math.sin(axisAngle) + alongAxis * Math.cos(axisAngle);

  return {
    x: pivotX + newRelX * scale,
    y: pivotY + newRelY * scale,
    scale: Math.max(ANIMATION.MIN_CIRCLE_SCALE, scale),
  };
}

/**
 * Circle drawing options
 */
export type CircleDrawOptions = {
  ctx: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  baseRadius: number;
  numCircles: number;
  circleSpacing: number;
  growthEnabled: boolean;
  growthOffset: number;
  tiltEnabled: boolean;
  currentTiltAngle: number;
  axisAngle: number;
  perspective: PerspectiveResult;
  canvasWidth: number;
  canvasHeight: number;
};

/**
 * Draw a set of concentric circles with optional growth and 3D effects
 */
export function drawCircles(options: CircleDrawOptions): void {
  const {
    ctx,
    centerX,
    centerY,
    baseRadius,
    numCircles,
    circleSpacing,
    growthEnabled,
    growthOffset,
    tiltEnabled,
    currentTiltAngle,
    axisAngle,
    perspective,
    canvasWidth,
    canvasHeight,
  } = options;

  const maxRadius = baseRadius + (numCircles - 1) * circleSpacing;

  for (let i = numCircles; i >= 1; i--) {
    let radius = baseRadius + (i - 1) * circleSpacing;

    if (growthEnabled) {
      // Apply growth offset with wrapping
      radius = radius + growthOffset;
      // Wrap radius back to start if it exceeds max
      while (radius > maxRadius + circleSpacing) {
        radius -= numCircles * circleSpacing;
      }
      // Skip if radius is less than base (it will wrap around)
      if (radius < baseRadius * 0.5) continue;
    }

    const normalizedPos = (radius - baseRadius) / (maxRadius - baseRadius + circleSpacing);
    const opacity = Math.max(0.2, 1 - normalizedPos * 0.7);
    const scaledRadius = Math.max(ANIMATION.MIN_CIRCLE_RADIUS, radius * perspective.scale);

    ctx.beginPath();
    if (tiltEnabled) {
      // Draw ellipse for 3D effect - ellipse is oriented along the rotation axis
      // Minor axis (compressed) is perpendicular to the dot-dot axis
      const minorScale = Math.abs(Math.cos(currentTiltAngle));
      // The ellipse rotation matches the axis angle
      ctx.ellipse(perspective.x, perspective.y, scaledRadius * minorScale, scaledRadius, axisAngle, 0, Math.PI * 2);
    } else {
      ctx.arc(centerX, centerY, scaledRadius, 0, Math.PI * 2);
    }
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * perspective.scale})`;
    ctx.lineWidth = 2 * perspective.scale;
    ctx.stroke();
  }
}

/**
 * Draw a dot with optional perspective transformation
 */
export function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  perspective: PerspectiveResult,
  tiltEnabled: boolean
): void {
  ctx.beginPath();
  ctx.arc(
    tiltEnabled ? perspective.x : x,
    tiltEnabled ? perspective.y : y,
    size * perspective.scale,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

/**
 * Clear the canvas with background color
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, width, height);
}

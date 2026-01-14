/**
 * Canvas drawing utilities for the orbital visualization
 */

import { ANIMATION } from "@/constants";
import type { ColorScheme, PetalConfig, PolarOscillator, OrbitOscillator } from "@/types";

/**
 * Perspective transformation result
 */
export type PerspectiveResult = {
  x: number;
  y: number;
  scale: number;
};

/**
 * Polar rendering options for shapes
 */
export type PolarRenderOptions = {
  mode: "circle" | "rose";
  petalConfig: PetalConfig;
  oscillator?: PolarOscillator;
  timeRef?: number; // For oscillator animation
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
  // New color and polar options
  colorScheme?: ColorScheme;
  polarOptions?: PolarRenderOptions;
  lineWidth?: number;
  lineSoftness?: number;
};

/**
 * Calculate the effective petal count for polar oscillation
 */
export function calculateOscillatedPetalCount(
  oscillator: PolarOscillator,
  timeRef: number
): { petalCount: number; weights: number[] } {
  if (!oscillator.enabled || oscillator.targets.length === 0) {
    return { petalCount: oscillator.targets[0] || 4, weights: [1] };
  }

  const { targets, speed, easing } = oscillator;

  // Calculate phase based on time
  const rawPhase = (timeRef * speed) % 1;

  // Apply easing
  let phase: number;
  switch (easing) {
    case "sine":
      // Smooth sine wave that oscillates 0 -> 1 -> 0
      phase = (Math.sin(rawPhase * Math.PI * 2) + 1) / 2;
      break;
    case "bounce":
      // Triangle wave for bouncy effect
      phase = rawPhase < 0.5 ? rawPhase * 2 : 2 - rawPhase * 2;
      break;
    case "linear":
    default:
      phase = rawPhase;
  }

  // Calculate which targets we're interpolating between
  const numTargets = targets.length;
  const expandedPhase = phase * (numTargets - 1);
  const lowerIdx = Math.floor(expandedPhase);
  const upperIdx = Math.min(lowerIdx + 1, numTargets - 1);
  const blend = expandedPhase - lowerIdx;

  // Return blended petal count
  const petalCount = targets[lowerIdx] + (targets[upperIdx] - targets[lowerIdx]) * blend;

  // Build weights array for each target
  const weights = targets.map((_, idx) => {
    if (idx === lowerIdx) return 1 - blend;
    if (idx === upperIdx) return blend;
    return 0;
  });

  return { petalCount, weights };
}

/**
 * Calculate orbit radius multiplier based on tempo-synced oscillator
 * @param oscillator - Orbit oscillator settings
 * @param timeRef - Current time in seconds
 * @param bpm - Beats per minute
 * @returns Radius multiplier (typically 0.5-1.5)
 */
export function calculateOrbitOscillation(
  oscillator: OrbitOscillator,
  timeRef: number,
  bpm: number
): number {
  if (!oscillator.enabled) {
    return 1;
  }

  const { amount, minRadius, maxRadius, division, phaseOffset, waveform } = oscillator;

  // Calculate phase based on tempo
  // At 120 BPM, one beat = 0.5 seconds
  // division=4 means quarter note, so one cycle per beat
  // division=1 means whole note (4 beats per cycle)
  const beatsPerSecond = bpm / 60;
  const cyclesPerSecond = beatsPerSecond / (4 / division); // Normalize to whole notes
  const rawPhase = ((timeRef * cyclesPerSecond) + phaseOffset) % 1;

  // Apply waveform
  let waveValue: number;
  switch (waveform) {
    case "sine":
      waveValue = (Math.sin(rawPhase * Math.PI * 2) + 1) / 2;
      break;
    case "triangle":
      waveValue = rawPhase < 0.5 ? rawPhase * 2 : 2 - rawPhase * 2;
      break;
    case "square":
      waveValue = rawPhase < 0.5 ? 1 : 0;
      break;
    case "sawtooth":
      waveValue = rawPhase;
      break;
    default:
      waveValue = (Math.sin(rawPhase * Math.PI * 2) + 1) / 2;
  }

  // Interpolate between min and max radius based on wave value and amount
  const range = maxRadius - minRadius;
  const modulation = minRadius + waveValue * range;

  // Blend between 1 (no modulation) and the modulated value based on amount
  return 1 + (modulation - 1) * amount;
}

/**
 * Draw a polar shape (rose curve or circle)
 * Uses weighted superposition of integer rose curves for smooth fractional transitions
 * Rose curve: r = cos(n * theta) where n is the petal count
 */
export function drawPolarShape(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  petalCount: number,
  openness: number,
  rotation: number,
  color: string,
  lineWidth: number,
  softness: number = 0
): void {
  // Use higher step count for smoother curves
  const steps = Math.max(180, Math.round(Math.max(petalCount, 4) * 60));
  const angleStep = (Math.PI * 2) / steps;

  // For smooth transitions between petal counts, we blend between
  // the floor and ceiling integer petal counts
  const lowerPetals = Math.floor(petalCount);
  const upperPetals = Math.ceil(petalCount);
  const blend = petalCount - lowerPetals;

  // Handle edge case where petalCount is exactly an integer
  const useBlending = blend > 0.001 && blend < 0.999;

  ctx.beginPath();

  for (let i = 0; i <= steps; i++) {
    const theta = i * angleStep + rotation;

    let roseR: number;

    if (useBlending) {
      // Blend between two integer petal curves for smooth transitions
      // Use abs(cos) to ensure positive radius values
      const lowerR = Math.abs(Math.cos(Math.max(1, lowerPetals) * theta));
      const upperR = Math.abs(Math.cos(Math.max(1, upperPetals) * theta));

      // Smooth interpolation using cosine easing for more natural transitions
      const smoothBlend = (1 - Math.cos(blend * Math.PI)) / 2;
      roseR = lowerR * (1 - smoothBlend) + upperR * smoothBlend;
    } else {
      // For integer petal counts, use direct formula
      roseR = Math.abs(Math.cos(Math.max(1, Math.round(petalCount)) * theta));
    }

    // Ensure minimum radius to prevent collapse to point
    roseR = Math.max(0.15, roseR);

    // Blend between circle (openness = 0) and rose (openness = 1)
    const circleR = 1;
    const blendedR = circleR * (1 - openness) + roseR * openness;

    const r = radius * blendedR;
    const x = centerX + r * Math.cos(theta);
    const y = centerY + r * Math.sin(theta);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  // Add glow effect if softness > 0
  if (softness > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = softness * 20;
  }

  ctx.stroke();

  // Reset shadow
  if (softness > 0) {
    ctx.shadowBlur = 0;
  }
}

/**
 * Parse hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }
  return { r: 255, g: 255, b: 255 };
}

/**
 * Interpolate between two colors
 */
export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Draw a set of concentric circles/shapes with optional growth, 3D effects, colors, and polar rendering
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
    colorScheme,
    polarOptions,
    lineWidth: customLineWidth,
    lineSoftness = 0,
  } = options;

  const maxRadius = baseRadius + (numCircles - 1) * circleSpacing;

  // Get polar settings
  const isPolar = polarOptions?.mode === "rose";
  let effectivePetalCount = polarOptions?.petalConfig.petalCount ?? 4;
  const openness = polarOptions?.petalConfig.openness ?? 0.5;
  const polarRotation = polarOptions?.petalConfig.rotation ?? 0;

  // Apply oscillator if enabled
  if (polarOptions?.oscillator?.enabled && polarOptions?.timeRef !== undefined) {
    const { petalCount } = calculateOscillatedPetalCount(
      polarOptions.oscillator,
      polarOptions.timeRef
    );
    effectivePetalCount = petalCount;
  }

  // Get colors
  const primaryColor = colorScheme?.primary ?? "#ffffff";
  const secondaryColor = colorScheme?.secondary ?? "#ffffff";
  const glowIntensity = colorScheme?.glowIntensity ?? 0;
  const effectiveSoftness = lineSoftness + glowIntensity * 0.3;

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

    // Interpolate color from primary to secondary based on position
    const color = lerpColor(primaryColor, secondaryColor, normalizedPos);
    const { r, g, b } = hexToRgb(color);
    const colorWithOpacity = `rgba(${r}, ${g}, ${b}, ${opacity * perspective.scale})`;

    const effectiveLineWidth = (customLineWidth ?? 2) * perspective.scale;

    if (isPolar && !tiltEnabled) {
      // Draw polar shape (rose curve)
      drawPolarShape(
        ctx,
        centerX,
        centerY,
        scaledRadius,
        effectivePetalCount,
        openness,
        polarRotation,
        colorWithOpacity,
        effectiveLineWidth,
        effectiveSoftness * opacity
      );
    } else {
      ctx.beginPath();
      if (tiltEnabled) {
        // Draw ellipse for 3D effect - ellipse is oriented along the rotation axis
        const minorScale = Math.abs(Math.cos(currentTiltAngle));
        ctx.ellipse(perspective.x, perspective.y, scaledRadius * minorScale, scaledRadius, axisAngle, 0, Math.PI * 2);
      } else {
        ctx.arc(centerX, centerY, scaledRadius, 0, Math.PI * 2);
      }

      ctx.strokeStyle = colorWithOpacity;
      ctx.lineWidth = effectiveLineWidth;

      // Add glow effect
      if (effectiveSoftness > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = effectiveSoftness * 20 * opacity;
      }

      ctx.stroke();

      if (effectiveSoftness > 0) {
        ctx.shadowBlur = 0;
      }
    }
  }
}

/**
 * Dot drawing options
 */
export type DotDrawOptions = {
  color?: string;
  secondaryColor?: string;
  glow?: string;
  glowIntensity?: number;
};

/**
 * Draw a dot with optional perspective transformation and custom colors
 */
export function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  perspective: PerspectiveResult,
  tiltEnabled: boolean,
  options?: DotDrawOptions
): void {
  const dotX = tiltEnabled ? perspective.x : x;
  const dotY = tiltEnabled ? perspective.y : y;
  const dotSize = size * perspective.scale;

  const color = options?.color ?? "#ffffff";
  const glow = options?.glow ?? color;
  const glowIntensity = options?.glowIntensity ?? 0;

  // Add glow effect
  if (glowIntensity > 0) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = glowIntensity * 25;
  }

  ctx.beginPath();
  ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Reset shadow
  if (glowIntensity > 0) {
    ctx.shadowBlur = 0;
  }
}

/**
 * Clear the canvas with background color
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundColor?: string
): void {
  ctx.fillStyle = backgroundColor ?? "#0a0a0a";
  ctx.fillRect(0, 0, width, height);
}

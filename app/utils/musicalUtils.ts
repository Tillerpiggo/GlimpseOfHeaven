/**
 * Musical utilities for snapping values to rhythmically meaningful multiples
 * using tempo-aware divisions and proper musical structure
 */

// ============================================================================
// TEMPO-AWARE DIVISIONS (for rotation and angle parameters)
// ============================================================================

/**
 * Musical note divisions mapped to fractions of a rotation (0-360°)
 * These represent how many rotations occur per measure/bar
 */
export const MUSICAL_NOTE_DIVISIONS = {
  // Whole notes and halves
  "1/1": 1, // 1 rotation per bar
  "1/2": 0.5, // half note
  "1/3": 1 / 3, // triplet whole
  "1/4": 0.25, // quarter note
  "1/6": 1 / 6, // triplet half
  "1/8": 0.125, // eighth note
  "1/12": 1 / 12, // triplet quarter
  "1/16": 0.0625, // sixteenth
  "1/24": 1 / 24, // triplet eighth
  "1/32": 0.03125, // thirty-second
} as const;

export type MusicalNoteDivision = keyof typeof MUSICAL_NOTE_DIVISIONS;

/**
 * Convert a musical note division to radians (0-2π)
 */
export function noteDivisionToRadians(division: MusicalNoteDivision): number {
  return MUSICAL_NOTE_DIVISIONS[division] * Math.PI * 2;
}

/**
 * Get all valid rotation values in radians
 */
export const VALID_ROTATION_RADIANS = Object.entries(MUSICAL_NOTE_DIVISIONS).map(
  ([_, divisor]) => divisor * Math.PI * 2
);

/**
 * Get the closest musical note division for a given radian value
 */
export function getClosestNoteDivision(radians: number): MusicalNoteDivision {
  // Normalize to 0-2π
  const normalized = ((radians % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  let closest: MusicalNoteDivision = "1/1";
  let minDistance = Infinity;

  for (const [division, divisor] of Object.entries(MUSICAL_NOTE_DIVISIONS)) {
    const divisionRadians = divisor * Math.PI * 2;
    const distance = Math.abs(normalized - divisionRadians);
    if (distance < minDistance) {
      minDistance = distance;
      closest = division as MusicalNoteDivision;
    }
  }

  return closest;
}

/**
 * Quantize rotation to nearest musical note division
 */
export function quantizeRotationToMusical(radians: number): number {
  const division = getClosestNoteDivision(radians);
  return noteDivisionToRadians(division);
}

/**
 * Format rotation as a musical note division
 */
export function formatRotationAsNote(radians: number): string {
  const division = getClosestNoteDivision(radians);
  return division;
}

// ============================================================================
// MULTIPLIERS (powers of 2 with musical in-betweens)
// ============================================================================

export const VALID_MULTIPLIERS = [0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8] as const;

/**
 * Powers of 2 for oscillator speeds (tempo-synced)
 * Ranges from 1/32 (0.03125) to 2
 */
export const VALID_OSCILLATOR_SPEEDS = [
  0.03125, // 1/32
  0.0625, // 1/16
  0.125, // 1/8
  0.25, // 1/4
  0.5, // 1/2
  1, // 1
  2, // 2
] as const;

/**
 * Quantize to nearest valid multiplier
 */
export function quantizeToMultiplier(value: number): number {
  let closest: number = VALID_MULTIPLIERS[0];
  let minDistance = Math.abs(value - closest);

  for (const multiplier of VALID_MULTIPLIERS) {
    const distance = Math.abs(value - multiplier);
    if (distance < minDistance) {
      minDistance = distance;
      closest = multiplier;
    }
  }

  return closest;
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}x`;
}

// ============================================================================
// PERCENTAGES (clean multiples: 0%, 10%, 25%, 50%, 75%, 100%)
// ============================================================================

export const VALID_PERCENTAGES = [0, 0.1, 0.25, 0.5, 0.75, 1] as const;

/**
 * Quantize to nearest valid percentage
 */
export function quantizeToPercentage(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  let closest: number = VALID_PERCENTAGES[0];
  let minDistance = Math.abs(clamped - closest);

  for (const pct of VALID_PERCENTAGES) {
    const distance = Math.abs(clamped - pct);
    if (distance < minDistance) {
      minDistance = distance;
      closest = pct;
    }
  }

  return closest;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// ============================================================================
// GENERIC QUANTIZATION
// ============================================================================

/**
 * Quantize a value to the nearest multiple of a snap interval
 */
export function quantize(value: number, snapInterval: number): number {
  if (snapInterval === 0) return value;
  return Math.round(value / snapInterval) * snapInterval;
}

/**
 * Quantize to a snap interval with min/max bounds
 */
export function quantizeToMusical(
  value: number,
  snapInterval: number,
  min: number,
  max: number
): number {
  if (snapInterval === 0) {
    return Math.max(min, Math.min(max, value));
  }

  const quantized = quantize(value, snapInterval);
  return Math.max(min, Math.min(max, quantized));
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

export function formatPixels(value: number): string {
  return `${Math.round(value)}px`;
}

export function formatCount(value: number): string {
  return Math.round(value).toString();
}

export function formatVelocity(value: number): string {
  return Math.round(value).toString();
}

// ============================================================================
// MUSICAL PARAMETER METADATA
// ============================================================================

export type MusicalParameterConfig = {
  snapInterval?: number; // For continuous snapping
  validValues?: readonly number[]; // For discrete snapping
  formatter: (value: number) => string;
  label?: string;
};

export type MusicalParameterMap = Record<string, MusicalParameterConfig>;

/**
 * Configuration for all musical parameters
 * Uses tempo-aware musical divisions for rotation
 * Uses powers of 2 for multipliers
 * Uses clean percentages
 */
export const MUSICAL_PARAMETERS: MusicalParameterMap = {
  // ========== VISUALIZATION SETTINGS ==========

  bpm: {
    snapInterval: 1,
    formatter: (v) => `${Math.round(v)} BPM`,
  },

  orbitRadius: {
    snapInterval: 10,
    formatter: formatPixels,
  },

  circleRadius: {
    snapInterval: 10,
    formatter: formatPixels,
  },

  circleSpacing: {
    snapInterval: 5,
    formatter: formatPixels,
  },

  dotSize: {
    snapInterval: 1,
    formatter: formatPixels,
  },

  numCircles: {
    snapInterval: 1,
    formatter: formatCount,
  },

  // Growth rate - powers of 2 with musical in-betweens
  growthRate: {
    validValues: VALID_MULTIPLIERS,
    formatter: formatMultiplier,
  },

  tiltAmount: {
    snapInterval: 5,
    formatter: (v) => `${Math.round(v)}°`,
  },

  // ========== SYNTH SETTINGS ==========

  // Petal count - whole numbers
  petalCount: {
    snapInterval: 1,
    formatter: formatCount,
  },

  // Openness - clean percentages
  openness: {
    validValues: VALID_PERCENTAGES,
    formatter: formatPercent,
  },

  // Rotation - tempo-aware musical note divisions
  rotation: {
    formatter: formatRotationAsNote,
  },

  lineWidth: {
    snapInterval: 0.5,
    formatter: formatPixels,
  },

  lineSoftness: {
    validValues: VALID_PERCENTAGES,
    formatter: formatPercent,
  },

  rotationAmount: {
    validValues: VALID_MULTIPLIERS,
    formatter: formatMultiplier,
  },

  // ========== OSCILLATOR SETTINGS ==========

  orbitOscillatorAmount: {
    validValues: VALID_PERCENTAGES,
    formatter: formatPercent,
  },

  orbitOscillatorMinRadius: {
    validValues: VALID_MULTIPLIERS,
    formatter: formatMultiplier,
  },

  orbitOscillatorMaxRadius: {
    validValues: VALID_MULTIPLIERS,
    formatter: formatMultiplier,
  },

  orbitOscillatorPhaseOffset: {
    formatter: (v) => formatRotationAsNote(v),
  },

  polarOscillatorSpeed: {
    validValues: VALID_OSCILLATOR_SPEEDS,
    formatter: formatMultiplier,
  },
};

/**
 * Smart quantizer that uses validValues if available, otherwise snapInterval
 */
export function smartQuantize(
  value: number,
  config: MusicalParameterConfig,
  min: number,
  max: number
): number {
  const clamped = Math.max(min, Math.min(max, value));

  if (config.validValues) {
    // Discrete snapping to valid values
    let closest: number = config.validValues[0];
    let minDistance = Math.abs(clamped - closest);

    for (const valid of config.validValues) {
      const distance = Math.abs(clamped - valid);
      if (distance < minDistance) {
        minDistance = distance;
        closest = valid;
      }
    }

    return closest;
  } else if (config.snapInterval) {
    // Continuous snapping
    return quantizeToMusical(clamped, config.snapInterval, min, max);
  }

  return clamped;
}

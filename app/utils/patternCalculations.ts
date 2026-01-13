/**
 * Pattern calculation utilities for the animation engine
 * These are pure functions extracted from the animation loop
 */

/**
 * Get pattern index and progress based on half-rotations
 * Subdivision makes patterns play FASTER - 2x subdivision means 2x speed
 * Pattern completes in (baseLength) half-rotations regardless of subdivision
 */
export function getPatternIndex(
  pattern: boolean[],
  totalHalfRots: number,
  baseLength: number
): { idx: number; progress: number } {
  const scaleFactor = pattern.length / baseLength;
  const scaledTime = totalHalfRots * scaleFactor;
  const idx = Math.floor(scaledTime) % pattern.length;
  const progress = scaledTime % 1;
  return { idx, progress };
}

/**
 * Count how many cells have been passed (for toggle counting)
 */
export function getPassedCellCount(
  pattern: boolean[],
  totalHalfRots: number,
  baseLength: number
): number {
  const scaleFactor = pattern.length / baseLength;
  return Math.floor(totalHalfRots * scaleFactor);
}

/**
 * Check if pattern has a hit at a specific cell index
 */
export function cellHasHit(pattern: boolean[], cellIndex: number): boolean {
  return pattern[cellIndex % pattern.length];
}

/**
 * Efficiently count toggles using modular arithmetic
 * O(patternLength) instead of O(passedCells)
 */
export function countTogglesEfficient(
  pattern: boolean[],
  passedCells: number
): number {
  const patternLen = pattern.length;

  // Count hits in one complete cycle
  let hitsPerCycle = 0;
  for (let i = 0; i < patternLen; i++) {
    if (pattern[i]) hitsPerCycle++;
  }

  // Complete cycles
  const completeCycles = Math.floor(passedCells / patternLen);
  const remainder = passedCells % patternLen;

  // Count hits in partial cycle
  let partialHits = 0;
  for (let i = 0; i < remainder; i++) {
    if (pattern[i]) partialHits++;
  }

  return completeCycles * hitsPerCycle + partialHits;
}

/**
 * Calculate cumulative angle for direction pattern efficiently
 */
export function calculateDirectionAngle(
  pattern: boolean[],
  passedCells: number,
  halfRotsPerCell: number,
  halfRotation: number,
  active: boolean
): { angle: number; currentDir: boolean } {
  if (!active) {
    return { angle: passedCells * halfRotsPerCell * halfRotation, currentDir: true };
  }

  const patternLen = pattern.length;

  // Calculate one complete cycle's contribution
  let cycleAngle = 0;
  let cycleDir = true;
  for (let i = 0; i < patternLen; i++) {
    if (pattern[i]) cycleDir = !cycleDir;
    cycleAngle += cycleDir ? halfRotsPerCell * halfRotation : -halfRotsPerCell * halfRotation;
  }

  const completeCycles = Math.floor(passedCells / patternLen);
  const remainder = passedCells % patternLen;

  // Start with complete cycles
  let angle = completeCycles * cycleAngle;

  // Add partial cycle
  let currentDir = countTogglesEfficient(pattern, completeCycles * patternLen) % 2 === 0;
  for (let i = 0; i < remainder; i++) {
    if (pattern[i]) currentDir = !currentDir;
    angle += currentDir ? halfRotsPerCell * halfRotation : -halfRotsPerCell * halfRotation;
  }

  return { angle, currentDir };
}

/**
 * Get position interpolation value (0 = at dot, 1 = at midpoint)
 */
export function getPositionT(
  pattern: boolean[],
  totalHalfRotations: number,
  baseLength: number,
  active: boolean
): number {
  if (!active) return 0;

  const scaleFactor = pattern.length / baseLength;
  const passedCells = getPassedCellCount(pattern, totalHalfRotations, baseLength);
  const currentCell = passedCells % pattern.length;
  const cellProgress = (totalHalfRotations * scaleFactor) % 1;

  // Count toggles efficiently O(patternLength) instead of O(passedCells)
  const toggleCount = countTogglesEfficient(pattern, passedCells);
  const currentlyAtMidpoint = toggleCount % 2 === 1;

  // Check if current cell has a hit (we're in a transition)
  const currentCellHasHit = cellHasHit(pattern, currentCell);

  if (currentCellHasHit) {
    // Smooth transition during this cell
    if (currentlyAtMidpoint) {
      return 1 - cellProgress; // Transitioning FROM midpoint
    } else {
      return cellProgress; // Transitioning TO midpoint
    }
  } else {
    return currentlyAtMidpoint ? 1 : 0;
  }
}

/**
 * Resize pattern when length changes
 */
export function resizePattern(pattern: boolean[], newLength: number): boolean[] {
  if (pattern.length === newLength) return pattern;
  const newPattern: boolean[] = [];
  for (let i = 0; i < newLength; i++) {
    // Repeat or truncate pattern
    newPattern.push(pattern[i % pattern.length] ?? false);
  }
  return newPattern;
}

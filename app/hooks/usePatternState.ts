/**
 * Hook for managing pattern state in the sequencer
 */

import { useState, useCallback } from "react";
import type { RowType, PatternLengths, Subdivisions, PatternData } from "@/types";
import { DEFAULT_PATTERN_LENGTHS, DEFAULT_SUBDIVISIONS } from "@/constants";
import { resizePattern } from "@/utils";

export type PatternStateReturn = {
  // Individual patterns
  directionPattern: boolean[];
  circles1VisiblePattern: boolean[];
  circles2VisiblePattern: boolean[];
  circles1PositionPattern: boolean[];
  circles2PositionPattern: boolean[];
  circlesGrowthPattern: boolean[];
  tilt3DPattern: boolean[];
  // Setters
  setDirectionPattern: (p: boolean[]) => void;
  setCircles1VisiblePattern: (p: boolean[]) => void;
  setCircles2VisiblePattern: (p: boolean[]) => void;
  setCircles1PositionPattern: (p: boolean[]) => void;
  setCircles2PositionPattern: (p: boolean[]) => void;
  setCirclesGrowthPattern: (p: boolean[]) => void;
  setTilt3DPattern: (p: boolean[]) => void;
  // Subdivisions and lengths
  subdivisions: Subdivisions;
  setSubdivisions: (s: Subdivisions) => void;
  patternLengths: PatternLengths;
  setPatternLengths: (p: PatternLengths) => void;
  // Helper functions
  getPatternForType: (type: RowType) => {
    pattern: boolean[];
    setPattern: (p: boolean[]) => void;
  };
  loadPatternIntoEditor: (pattern: PatternData) => void;
  resizePatternForLength: (pattern: boolean[], newLength: number) => boolean[];
};

export function usePatternState(): PatternStateReturn {
  // All patterns are boolean (true = toggle/hit)
  const [directionPattern, setDirectionPattern] = useState<boolean[]>([
    false, false, false, false, true, false, false, false,
    false, false, false, false, true, false, false, false,
  ]);

  const [circles1VisiblePattern, setCircles1VisiblePattern] = useState<boolean[]>(
    Array(16).fill(true)
  );

  const [circles2VisiblePattern, setCircles2VisiblePattern] = useState<boolean[]>([
    true, true, true, true, true, true, true, true,
    false, false, false, false, false, false, false, false,
  ]);

  const [circles1PositionPattern, setCircles1PositionPattern] = useState<boolean[]>([
    false, false, true, false, false, false, true, false,
    false, false, true, false, false, false, true, false,
  ]);

  const [circles2PositionPattern, setCircles2PositionPattern] = useState<boolean[]>([
    false, false, true, false, false, false, true, false,
    false, false, true, false, false, false, true, false,
  ]);

  const [circlesGrowthPattern, setCirclesGrowthPattern] = useState<boolean[]>(
    Array(16).fill(false)
  );

  const [tilt3DPattern, setTilt3DPattern] = useState<boolean[]>(
    Array(16).fill(false)
  );

  const [subdivisions, setSubdivisions] = useState<Subdivisions>({ ...DEFAULT_SUBDIVISIONS });
  const [patternLengths, setPatternLengths] = useState<PatternLengths>({ ...DEFAULT_PATTERN_LENGTHS });

  // Helper to get pattern and setter for a row type
  const getPatternForType = useCallback((type: RowType): { pattern: boolean[]; setPattern: (p: boolean[]) => void } => {
    switch (type) {
      case "direction":
        return { pattern: directionPattern, setPattern: setDirectionPattern };
      case "circles1Visible":
        return { pattern: circles1VisiblePattern, setPattern: setCircles1VisiblePattern };
      case "circles2Visible":
        return { pattern: circles2VisiblePattern, setPattern: setCircles2VisiblePattern };
      case "circles1Position":
        return { pattern: circles1PositionPattern, setPattern: setCircles1PositionPattern };
      case "circles2Position":
        return { pattern: circles2PositionPattern, setPattern: setCircles2PositionPattern };
      case "circlesGrowth":
        return { pattern: circlesGrowthPattern, setPattern: setCirclesGrowthPattern };
      case "tilt3D":
        return { pattern: tilt3DPattern, setPattern: setTilt3DPattern };
    }
  }, [
    directionPattern,
    circles1VisiblePattern,
    circles2VisiblePattern,
    circles1PositionPattern,
    circles2PositionPattern,
    circlesGrowthPattern,
    tilt3DPattern,
  ]);

  // Helper to load pattern data into editing state
  const loadPatternIntoEditor = useCallback((pattern: PatternData) => {
    setDirectionPattern(pattern.directionPattern);
    setCircles1VisiblePattern(pattern.circles1VisiblePattern);
    setCircles2VisiblePattern(pattern.circles2VisiblePattern);
    setCircles1PositionPattern(pattern.circles1PositionPattern);
    setCircles2PositionPattern(pattern.circles2PositionPattern);
    setCirclesGrowthPattern(pattern.circlesGrowthPattern);
    setTilt3DPattern(pattern.tilt3DPattern);
    setSubdivisions(pattern.subdivisions);
    setPatternLengths(pattern.patternLengths);
  }, []);

  return {
    directionPattern,
    circles1VisiblePattern,
    circles2VisiblePattern,
    circles1PositionPattern,
    circles2PositionPattern,
    circlesGrowthPattern,
    tilt3DPattern,
    setDirectionPattern,
    setCircles1VisiblePattern,
    setCircles2VisiblePattern,
    setCircles1PositionPattern,
    setCircles2PositionPattern,
    setCirclesGrowthPattern,
    setTilt3DPattern,
    subdivisions,
    setSubdivisions,
    patternLengths,
    setPatternLengths,
    getPatternForType,
    loadPatternIntoEditor,
    resizePatternForLength: resizePattern,
  };
}

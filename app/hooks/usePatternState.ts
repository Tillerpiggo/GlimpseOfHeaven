/**
 * Hook for managing pattern state in the sequencer
 */

import { useState, useCallback } from "react";
import type { RowType, PatternLengths, Subdivisions, PatternData, InstrumentType, EffectRowType, EffectPatternLengths, EffectSubdivisions } from "@/types";
import { DEFAULT_PATTERN_LENGTHS, DEFAULT_SUBDIVISIONS, DEFAULT_EFFECT_PATTERN_LENGTHS, DEFAULT_EFFECT_SUBDIVISIONS } from "@/constants";
import { resizePattern } from "@/utils";

export type PatternStateReturn = {
  // Instrument type
  instrument: InstrumentType;
  setInstrument: (i: InstrumentType) => void;
  // Individual patterns
  directionPattern: boolean[];
  circles1VisiblePattern: boolean[];
  circles2VisiblePattern: boolean[];
  circles1PositionPattern: boolean[];
  circles2PositionPattern: boolean[];
  circlesGrowthPattern: boolean[];
  tilt3DPattern: boolean[];
  // Effect patterns
  rotationEnabledPattern: boolean[];
  rotationDirectionPattern: boolean[];
  flipYPattern: boolean[];
  // Setters
  setDirectionPattern: (p: boolean[]) => void;
  setCircles1VisiblePattern: (p: boolean[]) => void;
  setCircles2VisiblePattern: (p: boolean[]) => void;
  setCircles1PositionPattern: (p: boolean[]) => void;
  setCircles2PositionPattern: (p: boolean[]) => void;
  setCirclesGrowthPattern: (p: boolean[]) => void;
  setTilt3DPattern: (p: boolean[]) => void;
  setRotationEnabledPattern: (p: boolean[]) => void;
  setRotationDirectionPattern: (p: boolean[]) => void;
  setFlipYPattern: (p: boolean[]) => void;
  // Subdivisions and lengths
  subdivisions: Subdivisions;
  setSubdivisions: (s: Subdivisions) => void;
  patternLengths: PatternLengths;
  setPatternLengths: (p: PatternLengths) => void;
  effectSubdivisions: EffectSubdivisions;
  setEffectSubdivisions: (s: EffectSubdivisions) => void;
  effectPatternLengths: EffectPatternLengths;
  setEffectPatternLengths: (p: EffectPatternLengths) => void;
  // Helper functions
  getPatternForType: (type: RowType) => {
    pattern: boolean[];
    setPattern: (p: boolean[]) => void;
  };
  getEffectPatternForType: (type: EffectRowType) => {
    pattern: boolean[];
    setPattern: (p: boolean[]) => void;
  };
  loadPatternIntoEditor: (pattern: PatternData) => void;
  resizePatternForLength: (pattern: boolean[], newLength: number) => boolean[];
};

export function usePatternState(): PatternStateReturn {
  // Instrument type
  const [instrument, setInstrument] = useState<InstrumentType>("orbital");

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

  // Effect patterns
  const [rotationEnabledPattern, setRotationEnabledPattern] = useState<boolean[]>(
    Array(16).fill(false)
  );

  const [rotationDirectionPattern, setRotationDirectionPattern] = useState<boolean[]>(
    Array(16).fill(false)
  );

  const [flipYPattern, setFlipYPattern] = useState<boolean[]>(
    Array(16).fill(false)
  );

  const [subdivisions, setSubdivisions] = useState<Subdivisions>({ ...DEFAULT_SUBDIVISIONS });
  const [patternLengths, setPatternLengths] = useState<PatternLengths>({ ...DEFAULT_PATTERN_LENGTHS });
  const [effectSubdivisions, setEffectSubdivisions] = useState<EffectSubdivisions>({ ...DEFAULT_EFFECT_SUBDIVISIONS });
  const [effectPatternLengths, setEffectPatternLengths] = useState<EffectPatternLengths>({ ...DEFAULT_EFFECT_PATTERN_LENGTHS });

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

  // Helper to get effect pattern and setter for an effect row type
  const getEffectPatternForType = useCallback((type: EffectRowType): { pattern: boolean[]; setPattern: (p: boolean[]) => void } => {
    switch (type) {
      case "rotationEnabled":
        return { pattern: rotationEnabledPattern, setPattern: setRotationEnabledPattern };
      case "rotationDirection":
        return { pattern: rotationDirectionPattern, setPattern: setRotationDirectionPattern };
      case "flipY":
        return { pattern: flipYPattern, setPattern: setFlipYPattern };
    }
  }, [rotationEnabledPattern, rotationDirectionPattern, flipYPattern]);

  // Helper to load pattern data into editing state
  const loadPatternIntoEditor = useCallback((pattern: PatternData) => {
    setInstrument(pattern.instrument || "orbital");
    setDirectionPattern(pattern.directionPattern);
    setCircles1VisiblePattern(pattern.circles1VisiblePattern);
    setCircles2VisiblePattern(pattern.circles2VisiblePattern);
    setCircles1PositionPattern(pattern.circles1PositionPattern);
    setCircles2PositionPattern(pattern.circles2PositionPattern);
    setCirclesGrowthPattern(pattern.circlesGrowthPattern);
    setTilt3DPattern(pattern.tilt3DPattern);
    setRotationEnabledPattern(pattern.rotationEnabledPattern || Array(16).fill(false));
    setRotationDirectionPattern(pattern.rotationDirectionPattern || Array(16).fill(false));
    setFlipYPattern(pattern.flipYPattern || Array(16).fill(false));
    setSubdivisions(pattern.subdivisions);
    setPatternLengths(pattern.patternLengths);
    setEffectSubdivisions(pattern.effectSubdivisions || { ...DEFAULT_EFFECT_SUBDIVISIONS });
    setEffectPatternLengths(pattern.effectPatternLengths || { ...DEFAULT_EFFECT_PATTERN_LENGTHS });
  }, []);

  return {
    instrument,
    setInstrument,
    directionPattern,
    circles1VisiblePattern,
    circles2VisiblePattern,
    circles1PositionPattern,
    circles2PositionPattern,
    circlesGrowthPattern,
    tilt3DPattern,
    rotationEnabledPattern,
    rotationDirectionPattern,
    flipYPattern,
    setDirectionPattern,
    setCircles1VisiblePattern,
    setCircles2VisiblePattern,
    setCircles1PositionPattern,
    setCircles2PositionPattern,
    setCirclesGrowthPattern,
    setTilt3DPattern,
    setRotationEnabledPattern,
    setRotationDirectionPattern,
    setFlipYPattern,
    subdivisions,
    setSubdivisions,
    patternLengths,
    setPatternLengths,
    effectSubdivisions,
    setEffectSubdivisions,
    effectPatternLengths,
    setEffectPatternLengths,
    getPatternForType,
    getEffectPatternForType,
    loadPatternIntoEditor,
    resizePatternForLength: resizePattern,
  };
}

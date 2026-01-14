/**
 * Hook for managing arrangement and pattern library
 */

import { useState, useCallback } from "react";
import type { PatternData, ArrangementClip, RowType, StackSettings } from "@/types";
import { createDefaultPattern, DEFAULT_SUBDIVISIONS, DEFAULT_PATTERN_LENGTHS } from "@/constants";
import { generateId } from "@/utils";

// Default settings for a new stack
const DEFAULT_STACK_SETTINGS: StackSettings = {
  flipY: false,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  opacity: 1,
  rotation: 0,
};

export type ArrangementReturn = {
  // Pattern library
  patterns: PatternData[];
  setPatterns: (p: PatternData[]) => void;
  currentPatternId: string;
  setCurrentPatternId: (id: string) => void;
  // Arrangement
  arrangement: ArrangementClip[];
  setArrangement: (a: ArrangementClip[]) => void;
  useArrangement: boolean;
  setUseArrangement: (v: boolean) => void;
  // Pattern management
  addNewPattern: (getCurrentPatternData: () => PatternData) => void;
  duplicatePattern: (getCurrentPatternData: () => PatternData) => void;
  deletePattern: (patternId: string) => void;
  renamePattern: (patternId: string, newName: string) => void;
  switchToPattern: (patternId: string, getCurrentPatternData: () => PatternData, loadPattern: (p: PatternData) => void) => void;
  // Arrangement management
  addClipToArrangement: (patternId: string, stack?: number) => void;
  getStackCount: () => number;
  addStack: () => void;
  removeClipFromArrangement: (clipId: string) => void;
  moveClip: (clipId: string, newStartBar: number, newStack?: number) => void;
  duplicateClip: (clipId: string, newStartBar: number, newStack?: number) => void;
  // Helpers
  getArrangementLength: () => number;
  getActiveClip: (barPosition: number) => ArrangementClip | null;
  getPatternById: (patternId: string) => PatternData | null;
  getActivePatternForType: (
    type: RowType,
    barInArrangement: number,
    editorPattern: boolean[]
  ) => boolean[];
  getActiveSubdivisionsForType: (
    type: RowType,
    barInArrangement: number,
    editorSubdivisions: Record<RowType, number>
  ) => number;
  getActivePatternLengthForType: (
    type: RowType,
    barInArrangement: number,
    editorPatternLengths: Record<RowType, number>
  ) => number;
  // Stack settings
  stackSettings: Record<number, StackSettings>;
  setStackSettings: (s: Record<number, StackSettings>) => void;
  getStackSettings: (stackIndex: number) => StackSettings;
  updateStackSettings: (stackIndex: number, settings: Partial<StackSettings>) => void;
};

export function useArrangement(): ArrangementReturn {
  const [patterns, setPatterns] = useState<PatternData[]>([
    createDefaultPattern("Pattern 1"),
  ]);
  const [currentPatternId, setCurrentPatternId] = useState<string>(patterns[0]?.id || "");
  const [arrangement, setArrangement] = useState<ArrangementClip[]>([]);
  const [useArrangementMode, setUseArrangement] = useState(true);
  const [stackSettings, setStackSettings] = useState<Record<number, StackSettings>>({});

  // Get arrangement length in bars
  const getArrangementLength = useCallback((): number => {
    if (arrangement.length === 0) return 0;
    return Math.max(...arrangement.map((c) => c.startBar + c.length));
  }, [arrangement]);

  // Get the active clip at a bar position
  const getActiveClip = useCallback(
    (barPosition: number): ArrangementClip | null => {
      if (arrangement.length === 0) return null;
      for (const clip of arrangement) {
        if (barPosition >= clip.startBar && barPosition < clip.startBar + clip.length) {
          return clip;
        }
      }
      return null;
    },
    [arrangement]
  );

  // Get pattern by ID
  const getPatternById = useCallback(
    (patternId: string): PatternData | null => {
      return patterns.find((p) => p.id === patternId) || null;
    },
    [patterns]
  );

  // Get the pattern data to use for a given row type at current playback position
  const getActivePatternForType = useCallback(
    (type: RowType, barInArrangement: number, editorPattern: boolean[]): boolean[] => {
      if (!useArrangementMode || arrangement.length === 0) {
        return editorPattern;
      }

      const activeClip = getActiveClip(barInArrangement);
      if (!activeClip) {
        return Array(16).fill(false);
      }

      const pattern = getPatternById(activeClip.patternId);
      if (!pattern) {
        return Array(16).fill(false);
      }

      switch (type) {
        case "direction":
          return pattern.directionPattern;
        case "circles1Visible":
          return pattern.circles1VisiblePattern;
        case "circles2Visible":
          return pattern.circles2VisiblePattern;
        case "circles1Position":
          return pattern.circles1PositionPattern;
        case "circles2Position":
          return pattern.circles2PositionPattern;
        case "circlesGrowth":
          return pattern.circlesGrowthPattern;
        case "tilt3D":
          return pattern.tilt3DPattern;
      }
    },
    [useArrangementMode, arrangement, getActiveClip, getPatternById]
  );

  // Get active subdivisions for a row type
  const getActiveSubdivisionsForType = useCallback(
    (
      type: RowType,
      barInArrangement: number,
      editorSubdivisions: Record<RowType, number>
    ): number => {
      if (!useArrangementMode || arrangement.length === 0) {
        return editorSubdivisions[type];
      }

      const activeClip = getActiveClip(barInArrangement);
      if (!activeClip) return 1;

      const pattern = getPatternById(activeClip.patternId);
      if (!pattern) return 1;

      return pattern.subdivisions[type];
    },
    [useArrangementMode, arrangement, getActiveClip, getPatternById]
  );

  // Get active pattern length for a row type
  const getActivePatternLengthForType = useCallback(
    (
      type: RowType,
      barInArrangement: number,
      editorPatternLengths: Record<RowType, number>
    ): number => {
      if (!useArrangementMode || arrangement.length === 0) {
        return editorPatternLengths[type];
      }

      const activeClip = getActiveClip(barInArrangement);
      if (!activeClip) return 16;

      const pattern = getPatternById(activeClip.patternId);
      if (!pattern) return 16;

      return pattern.patternLengths[type];
    },
    [useArrangementMode, arrangement, getActiveClip, getPatternById]
  );

  // Pattern management
  const addNewPattern = useCallback(
    (getCurrentPatternData: () => PatternData) => {
      const updatedPatterns = patterns.map((p) =>
        p.id === currentPatternId ? getCurrentPatternData() : p
      );
      const newPattern = createDefaultPattern(`Pattern ${patterns.length + 1}`);
      setPatterns([...updatedPatterns, newPattern]);
      setCurrentPatternId(newPattern.id);
    },
    [patterns, currentPatternId]
  );

  const duplicatePattern = useCallback(
    (getCurrentPatternData: () => PatternData) => {
      const currentPattern = getCurrentPatternData();
      const newPattern: PatternData = {
        ...currentPattern,
        id: generateId(),
        name: `${currentPattern.name} (copy)`,
      };
      const updatedPatterns = patterns.map((p) =>
        p.id === currentPatternId ? currentPattern : p
      );
      setPatterns([...updatedPatterns, newPattern]);
      setCurrentPatternId(newPattern.id);
    },
    [patterns, currentPatternId]
  );

  const deletePattern = useCallback(
    (patternId: string) => {
      if (patterns.length <= 1) return;
      const updatedPatterns = patterns.filter((p) => p.id !== patternId);
      setPatterns(updatedPatterns);
      setArrangement(arrangement.filter((c) => c.patternId !== patternId));
      if (patternId === currentPatternId && updatedPatterns.length > 0) {
        setCurrentPatternId(updatedPatterns[0].id);
      }
    },
    [patterns, arrangement, currentPatternId]
  );

  const renamePattern = useCallback(
    (patternId: string, newName: string) => {
      setPatterns(
        patterns.map((p) => (p.id === patternId ? { ...p, name: newName } : p))
      );
    },
    [patterns]
  );

  const switchToPattern = useCallback(
    (
      patternId: string,
      getCurrentPatternData: () => PatternData,
      loadPattern: (p: PatternData) => void
    ) => {
      setPatterns(
        patterns.map((p) =>
          p.id === currentPatternId ? getCurrentPatternData() : p
        )
      );
      const pattern = patterns.find((p) => p.id === patternId);
      if (pattern) {
        loadPattern(pattern);
        setCurrentPatternId(patternId);
      }
    },
    [patterns, currentPatternId]
  );

  // Arrangement management
  const addClipToArrangement = useCallback(
    (patternId: string, stack: number = 0) => {
      const pattern = patterns.find((p) => p.id === patternId);
      if (!pattern) return;
      // Find the end bar for this specific stack
      const stackClips = arrangement.filter((c) => c.stack === stack);
      const endBar = stackClips.reduce(
        (max, clip) => Math.max(max, clip.startBar + clip.length),
        0
      );
      const newClip: ArrangementClip = {
        id: generateId(),
        patternId,
        startBar: endBar,
        length: pattern.bars,
        stack,
      };
      setArrangement([...arrangement, newClip]);
    },
    [patterns, arrangement]
  );

  const removeClipFromArrangement = useCallback(
    (clipId: string) => {
      setArrangement(arrangement.filter((c) => c.id !== clipId));
    },
    [arrangement]
  );

  const moveClip = useCallback(
    (clipId: string, newStartBar: number, newStack?: number) => {
      setArrangement(
        arrangement.map((c) =>
          c.id === clipId
            ? {
                ...c,
                startBar: Math.max(0, newStartBar),
                ...(newStack !== undefined ? { stack: newStack } : {}),
              }
            : c
        )
      );
    },
    [arrangement]
  );

  // Duplicate a clip at a new position
  const duplicateClip = useCallback(
    (clipId: string, newStartBar: number, newStack?: number) => {
      const clip = arrangement.find((c) => c.id === clipId);
      if (!clip) return;
      const newClip: ArrangementClip = {
        id: generateId(),
        patternId: clip.patternId,
        startBar: Math.max(0, newStartBar),
        length: clip.length,
        stack: newStack !== undefined ? newStack : clip.stack,
      };
      setArrangement([...arrangement, newClip]);
    },
    [arrangement]
  );

  // Get the number of stacks in the arrangement
  const getStackCount = useCallback((): number => {
    if (arrangement.length === 0) return 1;
    const maxStack = Math.max(...arrangement.map((c) => c.stack ?? 0));
    return maxStack + 1;
  }, [arrangement]);

  // Add a new stack (doesn't actually add anything, just returns the next stack index)
  const addStack = useCallback((): void => {
    // Stacks are created implicitly when clips are added
    // This is just a placeholder for UI purposes
  }, []);

  // Get settings for a stack (returns defaults if not set)
  const getStackSettings = useCallback(
    (stackIndex: number): StackSettings => {
      return stackSettings[stackIndex] || { ...DEFAULT_STACK_SETTINGS };
    },
    [stackSettings]
  );

  // Update settings for a stack
  const updateStackSettings = useCallback(
    (stackIndex: number, settings: Partial<StackSettings>) => {
      setStackSettings((prev) => ({
        ...prev,
        [stackIndex]: {
          ...(prev[stackIndex] || DEFAULT_STACK_SETTINGS),
          ...settings,
        },
      }));
    },
    []
  );

  return {
    patterns,
    setPatterns,
    currentPatternId,
    setCurrentPatternId,
    arrangement,
    setArrangement,
    useArrangement: useArrangementMode,
    setUseArrangement,
    addNewPattern,
    duplicatePattern,
    deletePattern,
    renamePattern,
    switchToPattern,
    addClipToArrangement,
    getStackCount,
    addStack,
    removeClipFromArrangement,
    moveClip,
    duplicateClip,
    getArrangementLength,
    getActiveClip,
    getPatternById,
    getActivePatternForType,
    getActiveSubdivisionsForType,
    getActivePatternLengthForType,
    stackSettings,
    setStackSettings,
    getStackSettings,
    updateStackSettings,
  };
}

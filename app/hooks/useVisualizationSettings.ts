/**
 * Hook for managing visualization settings (orbit, circles, etc.)
 */

import { useState } from "react";
import { DEFAULT_VISUALIZATION } from "@/constants";

export type VisualizationSettingsReturn = {
  orbitRadius: number;
  setOrbitRadius: (v: number) => void;
  bpm: number;
  setBpm: (v: number) => void;
  circleRadius: number;
  setCircleRadius: (v: number) => void;
  dotSize: number;
  setDotSize: (v: number) => void;
  numCircles: number;
  setNumCircles: (v: number) => void;
  circleSpacing: number;
  setCircleSpacing: (v: number) => void;
  growthRate: number;
  setGrowthRate: (v: number) => void;
  tiltAmount: number;
  setTiltAmount: (v: number) => void;
  resetToDefaults: () => void;
};

export function useVisualizationSettings(): VisualizationSettingsReturn {
  const [orbitRadius, setOrbitRadius] = useState<number>(DEFAULT_VISUALIZATION.orbitRadius);
  const [bpm, setBpm] = useState<number>(DEFAULT_VISUALIZATION.bpm);
  const [circleRadius, setCircleRadius] = useState<number>(DEFAULT_VISUALIZATION.circleRadius);
  const [dotSize, setDotSize] = useState<number>(DEFAULT_VISUALIZATION.dotSize);
  const [numCircles, setNumCircles] = useState<number>(DEFAULT_VISUALIZATION.numCircles);
  const [circleSpacing, setCircleSpacing] = useState<number>(DEFAULT_VISUALIZATION.circleSpacing);
  const [growthRate, setGrowthRate] = useState<number>(DEFAULT_VISUALIZATION.growthRate);
  const [tiltAmount, setTiltAmount] = useState<number>(DEFAULT_VISUALIZATION.tiltAmount);

  const resetToDefaults = () => {
    setOrbitRadius(DEFAULT_VISUALIZATION.orbitRadius);
    setBpm(DEFAULT_VISUALIZATION.bpm);
    setCircleRadius(DEFAULT_VISUALIZATION.circleRadius);
    setDotSize(DEFAULT_VISUALIZATION.dotSize);
    setNumCircles(DEFAULT_VISUALIZATION.numCircles);
    setCircleSpacing(DEFAULT_VISUALIZATION.circleSpacing);
    setGrowthRate(DEFAULT_VISUALIZATION.growthRate);
    setTiltAmount(DEFAULT_VISUALIZATION.tiltAmount);
  };

  return {
    orbitRadius,
    setOrbitRadius,
    bpm,
    setBpm,
    circleRadius,
    setCircleRadius,
    dotSize,
    setDotSize,
    numCircles,
    setNumCircles,
    circleSpacing,
    setCircleSpacing,
    growthRate,
    setGrowthRate,
    tiltAmount,
    setTiltAmount,
    resetToDefaults,
  };
}

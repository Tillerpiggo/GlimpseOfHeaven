/**
 * Hook for managing synth settings state
 */

import { useState, useCallback, useMemo } from "react";
import type {
  SynthSettings,
  ColorScheme,
  PolarMode,
  PetalConfig,
  PolarOscillator,
  OrbitOscillator,
  RadiusOscillator,
} from "@/types";
import { COLOR_SCHEMES, DEFAULT_SYNTH_SETTINGS } from "@/types";

export type UseSynthSettingsReturn = {
  // Current settings
  settings: SynthSettings;

  // Color scheme
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme | string) => void;
  colorSchemeNames: string[];

  // Polar mode
  polarMode: PolarMode;
  setPolarMode: (mode: PolarMode) => void;

  // Petal configuration
  petalConfig: PetalConfig;
  setPetalCount: (count: number) => void;
  setPetalOpenness: (openness: number) => void;
  setPetalRotation: (rotation: number) => void;

  // Polar oscillator
  polarOscillator: PolarOscillator;
  setOscillatorEnabled: (enabled: boolean) => void;
  setOscillatorTargets: (targets: number[]) => void;
  setOscillatorSpeed: (speed: number) => void;
  setOscillatorEasing: (easing: "sine" | "linear" | "bounce") => void;

  // Orbit oscillator
  orbitOscillator: OrbitOscillator;
  setOrbitOscillatorEnabled: (enabled: boolean) => void;
  setOrbitOscillatorAmount: (amount: number) => void;
  setOrbitOscillatorMinRadius: (min: number) => void;
  setOrbitOscillatorMaxRadius: (max: number) => void;
  setOrbitOscillatorDivision: (division: number) => void;
  setOrbitOscillatorPhaseOffset: (offset: number) => void;
  setOrbitOscillatorWaveform: (waveform: "sine" | "triangle" | "square" | "sawtooth") => void;

  // Radius oscillator
  radiusOscillator: RadiusOscillator;
  setRadiusOscillatorEnabled: (enabled: boolean) => void;
  setRadiusOscillatorAmount: (amount: number) => void;
  setRadiusOscillatorMinRadius: (min: number) => void;
  setRadiusOscillatorMaxRadius: (max: number) => void;
  setRadiusOscillatorDivision: (division: number) => void;
  setRadiusOscillatorPhaseOffset: (offset: number) => void;
  setRadiusOscillatorWaveform: (waveform: "sine" | "triangle" | "square" | "sawtooth") => void;

  // Line style
  lineWidth: number;
  setLineWidth: (width: number) => void;
  lineSoftness: number;
  setLineSoftness: (softness: number) => void;

  // Rotation
  rotationAmount: number;
  setRotationAmount: (amount: number) => void;

  // Settings management
  setSettings: (settings: SynthSettings) => void;

  // Reset
  reset: () => void;
};

export function useSynthSettings(
  initialSettings?: Partial<SynthSettings>
): UseSynthSettingsReturn {
  const [settings, setSettings] = useState<SynthSettings>(() => ({
    ...DEFAULT_SYNTH_SETTINGS,
    ...initialSettings,
    // Ensure nested oscillator objects are properly merged with defaults
    radiusOscillator: {
      ...DEFAULT_SYNTH_SETTINGS.radiusOscillator,
      ...initialSettings?.radiusOscillator,
    },
    orbitOscillator: {
      ...DEFAULT_SYNTH_SETTINGS.orbitOscillator,
      ...initialSettings?.orbitOscillator,
    },
    polarOscillator: {
      ...DEFAULT_SYNTH_SETTINGS.polarOscillator,
      ...initialSettings?.polarOscillator,
    },
  }));

  // Get all color scheme names
  const colorSchemeNames = useMemo(() => Object.keys(COLOR_SCHEMES), []);

  // Color scheme setters
  const setColorScheme = useCallback((schemeOrName: ColorScheme | string) => {
    setSettings((prev) => ({
      ...prev,
      colorScheme:
        typeof schemeOrName === "string"
          ? COLOR_SCHEMES[schemeOrName] ?? prev.colorScheme
          : schemeOrName,
    }));
  }, []);

  // Polar mode setters
  const setPolarMode = useCallback((mode: PolarMode) => {
    setSettings((prev) => ({
      ...prev,
      polarMode: mode,
    }));
  }, []);

  // Petal config setters
  const setPetalCount = useCallback((count: number) => {
    setSettings((prev) => ({
      ...prev,
      petalConfig: {
        ...prev.petalConfig,
        petalCount: Math.max(1, Math.min(8, count)),
      },
    }));
  }, []);

  const setPetalOpenness = useCallback((openness: number) => {
    setSettings((prev) => ({
      ...prev,
      petalConfig: {
        ...prev.petalConfig,
        openness: Math.max(0, Math.min(1, openness)),
      },
    }));
  }, []);

  const setPetalRotation = useCallback((rotation: number) => {
    setSettings((prev) => ({
      ...prev,
      petalConfig: {
        ...prev.petalConfig,
        rotation: rotation % (Math.PI * 2),
      },
    }));
  }, []);

  // Oscillator setters
  const setOscillatorEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      polarOscillator: {
        ...prev.polarOscillator,
        enabled,
      },
    }));
  }, []);

  const setOscillatorTargets = useCallback((targets: number[]) => {
    setSettings((prev) => ({
      ...prev,
      polarOscillator: {
        ...prev.polarOscillator,
        targets: targets.filter((t) => t >= 1 && t <= 8),
      },
    }));
  }, []);

  const setOscillatorSpeed = useCallback((speed: number) => {
    setSettings((prev) => ({
      ...prev,
      polarOscillator: {
        ...prev.polarOscillator,
        speed: Math.max(0.01, Math.min(2, speed)),
      },
    }));
  }, []);

  const setOscillatorEasing = useCallback(
    (easing: "sine" | "linear" | "bounce") => {
      setSettings((prev) => ({
        ...prev,
        polarOscillator: {
          ...prev.polarOscillator,
          easing,
        },
      }));
    },
    []
  );

  // Orbit oscillator setters
  const setOrbitOscillatorEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      orbitOscillator: {
        ...prev.orbitOscillator,
        enabled,
      },
    }));
  }, []);

  const setOrbitOscillatorAmount = useCallback((amount: number) => {
    setSettings((prev) => ({
      ...prev,
      orbitOscillator: {
        ...prev.orbitOscillator,
        amount: Math.max(0, Math.min(1, amount)),
      },
    }));
  }, []);

  const setOrbitOscillatorMinRadius = useCallback((min: number) => {
    setSettings((prev) => ({
      ...prev,
      orbitOscillator: {
        ...prev.orbitOscillator,
        minRadius: Math.max(0, Math.min(1, min)),
      },
    }));
  }, []);

  const setOrbitOscillatorMaxRadius = useCallback((max: number) => {
    setSettings((prev) => ({
      ...prev,
      orbitOscillator: {
        ...prev.orbitOscillator,
        maxRadius: Math.max(1, Math.min(2, max)),
      },
    }));
  }, []);

  const setOrbitOscillatorDivision = useCallback((division: number) => {
    setSettings((prev) => ({
      ...prev,
      orbitOscillator: {
        ...prev.orbitOscillator,
        division: Math.max(1, Math.min(32, division)),
      },
    }));
  }, []);

  const setOrbitOscillatorPhaseOffset = useCallback((offset: number) => {
    setSettings((prev) => ({
      ...prev,
      orbitOscillator: {
        ...prev.orbitOscillator,
        phaseOffset: ((offset % 1) + 1) % 1, // Keep between 0-1
      },
    }));
  }, []);

  const setOrbitOscillatorWaveform = useCallback(
    (waveform: "sine" | "triangle" | "square" | "sawtooth") => {
      setSettings((prev) => ({
        ...prev,
        orbitOscillator: {
          ...prev.orbitOscillator,
          waveform,
        },
      }));
    },
    []
  );

  // Radius oscillator setters
  const setRadiusOscillatorEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      radiusOscillator: {
        ...prev.radiusOscillator,
        enabled,
      },
    }));
  }, []);

  const setRadiusOscillatorAmount = useCallback((amount: number) => {
    setSettings((prev) => ({
      ...prev,
      radiusOscillator: {
        ...prev.radiusOscillator,
        amount: Math.max(0, Math.min(1, amount)),
      },
    }));
  }, []);

  const setRadiusOscillatorMinRadius = useCallback((min: number) => {
    setSettings((prev) => ({
      ...prev,
      radiusOscillator: {
        ...prev.radiusOscillator,
        minRadius: Math.max(0, Math.min(2, min)),
      },
    }));
  }, []);

  const setRadiusOscillatorMaxRadius = useCallback((max: number) => {
    setSettings((prev) => ({
      ...prev,
      radiusOscillator: {
        ...prev.radiusOscillator,
        maxRadius: Math.max(0, Math.min(2, max)),
      },
    }));
  }, []);

  const setRadiusOscillatorDivision = useCallback((division: number) => {
    setSettings((prev) => ({
      ...prev,
      radiusOscillator: {
        ...prev.radiusOscillator,
        division: Math.max(1, Math.min(32, division)),
      },
    }));
  }, []);

  const setRadiusOscillatorPhaseOffset = useCallback((offset: number) => {
    setSettings((prev) => ({
      ...prev,
      radiusOscillator: {
        ...prev.radiusOscillator,
        phaseOffset: ((offset % 1) + 1) % 1, // Keep between 0-1
      },
    }));
  }, []);

  const setRadiusOscillatorWaveform = useCallback(
    (waveform: "sine" | "triangle" | "square" | "sawtooth") => {
      setSettings((prev) => ({
        ...prev,
        radiusOscillator: {
          ...prev.radiusOscillator,
          waveform,
        },
      }));
    },
    []
  );

  // Line style setters
  const setLineWidth = useCallback((width: number) => {
    setSettings((prev) => ({
      ...prev,
      lineWidth: Math.max(1, Math.min(5, width)),
    }));
  }, []);

  const setLineSoftness = useCallback((softness: number) => {
    setSettings((prev) => ({
      ...prev,
      lineSoftness: Math.max(0, Math.min(1, softness)),
    }));
  }, []);

  // Rotation amount setter
  const setRotationAmount = useCallback((amount: number) => {
    setSettings((prev) => ({
      ...prev,
      rotationAmount: Math.max(0, Math.min(2, amount)),
    }));
  }, []);

  // Reset to defaults
  const reset = useCallback(() => {
    setSettings(DEFAULT_SYNTH_SETTINGS);
  }, []);

  return {
    settings,
    colorScheme: settings.colorScheme,
    setColorScheme,
    colorSchemeNames,
    polarMode: settings.polarMode,
    setPolarMode,
    petalConfig: settings.petalConfig,
    setPetalCount,
    setPetalOpenness,
    setPetalRotation,
    polarOscillator: settings.polarOscillator,
    setOscillatorEnabled,
    setOscillatorTargets,
    setOscillatorSpeed,
    setOscillatorEasing,
    orbitOscillator: settings.orbitOscillator,
    setOrbitOscillatorEnabled,
    setOrbitOscillatorAmount,
    setOrbitOscillatorMinRadius,
    setOrbitOscillatorMaxRadius,
    setOrbitOscillatorDivision,
    setOrbitOscillatorPhaseOffset,
    setOrbitOscillatorWaveform,
    radiusOscillator: settings.radiusOscillator,
    setRadiusOscillatorEnabled,
    setRadiusOscillatorAmount,
    setRadiusOscillatorMinRadius,
    setRadiusOscillatorMaxRadius,
    setRadiusOscillatorDivision,
    setRadiusOscillatorPhaseOffset,
    setRadiusOscillatorWaveform,
    lineWidth: settings.lineWidth,
    setLineWidth,
    lineSoftness: settings.lineSoftness,
    setLineSoftness,
    rotationAmount: settings.rotationAmount,
    setRotationAmount,
    setSettings,
    reset,
  };
}

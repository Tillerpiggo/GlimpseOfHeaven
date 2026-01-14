/**
 * Synth settings types - global visual settings for synth rendering
 */

/**
 * Color scheme for the synth visualization
 */
export type ColorScheme = {
  name: string;
  // Circle/shape colors
  primary: string; // Main circle/shape color (hex)
  secondary: string; // Secondary accent color (hex)
  // Dot colors
  dotPrimary: string;
  dotSecondary: string;
  // Background
  background: string;
  // Glow/accent effects
  glow: string;
  glowIntensity: number; // 0-1
};

/**
 * Polar shape mode - determines the base shape function
 * Circle uses r = 1 (constant radius)
 * Rose uses r = cos(n*theta) where n determines petal count
 */
export type PolarMode = "circle" | "rose";

/**
 * Petal configuration for rose curves
 * The rose curve is r = cos(n*theta)
 * n=1 gives 1 petal, n=2 gives 4 petals, n=3 gives 3 petals, etc.
 */
export type PetalConfig = {
  // Number of petals in the rose curve (1-8)
  petalCount: number;
  // How much the petals "open" (0 = closed, 1 = fully open)
  openness: number;
  // Rotation offset for the petals
  rotation: number;
};

/**
 * Polar oscillator - smoothly transitions between different polar functions
 */
export type PolarOscillator = {
  enabled: boolean;
  // Which petal counts to oscillate between (e.g., [1, 2, 4])
  targets: number[];
  // Speed of oscillation (cycles per second)
  speed: number;
  // Easing type for the oscillation
  easing: "sine" | "linear" | "bounce";
  // Current phase (0-1, managed by animation)
  phase?: number;
};

/**
 * Orbit oscillator - modulates the distance between the two orbital circles
 * Synced to tempo with configurable division and phase offset
 */
export type OrbitOscillator = {
  enabled: boolean;
  // Amount of modulation (0 = none, 1 = full range from min to max)
  amount: number;
  // Minimum orbit radius multiplier (negative values flip the orbit)
  minRadius: number;
  // Maximum orbit radius multiplier
  maxRadius: number;
  // Tempo division: 1 = whole note, 2 = half, 4 = quarter, 8 = eighth, etc.
  division: number;
  // Phase offset (0-1, where 0.5 = half cycle offset)
  phaseOffset: number;
  // Waveform shape
  waveform: "sine" | "triangle" | "square" | "sawtooth";
};

/**
 * Complete synth settings
 */
export type SynthSettings = {
  // Color configuration
  colorScheme: ColorScheme;
  // Polar rendering mode
  polarMode: PolarMode;
  // Petal configuration (used when polarMode is "rose")
  petalConfig: PetalConfig;
  // Oscillator for smooth polar transitions
  polarOscillator: PolarOscillator;
  // Orbit distance oscillator
  orbitOscillator: OrbitOscillator;
  // Line style
  lineWidth: number; // Base line width (1-5)
  lineSoftness: number; // How soft/glowy the lines are (0-1)
  // Rotation amount multiplier (0-2, where 1 = normal half-rotation)
  rotationAmount: number;
};

/**
 * Preset color schemes with nice aesthetics
 */
export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  midnight: {
    name: "Midnight",
    primary: "#6366f1", // Indigo
    secondary: "#a855f7", // Purple
    dotPrimary: "#c4b5fd", // Light violet
    dotSecondary: "#f0abfc", // Light fuchsia
    background: "#0a0a0f",
    glow: "#818cf8",
    glowIntensity: 0.4,
  },
  aurora: {
    name: "Aurora",
    primary: "#22d3ee", // Cyan
    secondary: "#34d399", // Emerald
    dotPrimary: "#a5f3fc", // Light cyan
    dotSecondary: "#6ee7b7", // Light emerald
    background: "#0a0f0f",
    glow: "#2dd4bf",
    glowIntensity: 0.5,
  },
  sunset: {
    name: "Sunset",
    primary: "#f97316", // Orange
    secondary: "#ec4899", // Pink
    dotPrimary: "#fcd34d", // Amber
    dotSecondary: "#fb7185", // Rose
    background: "#0f0a0a",
    glow: "#f472b6",
    glowIntensity: 0.45,
  },
  ocean: {
    name: "Ocean",
    primary: "#0ea5e9", // Sky blue
    secondary: "#6366f1", // Indigo
    dotPrimary: "#7dd3fc", // Light sky
    dotSecondary: "#a5b4fc", // Light indigo
    background: "#0a0a12",
    glow: "#38bdf8",
    glowIntensity: 0.4,
  },
  forest: {
    name: "Forest",
    primary: "#22c55e", // Green
    secondary: "#84cc16", // Lime
    dotPrimary: "#86efac", // Light green
    dotSecondary: "#bef264", // Light lime
    background: "#0a0f0a",
    glow: "#4ade80",
    glowIntensity: 0.35,
  },
  ember: {
    name: "Ember",
    primary: "#ef4444", // Red
    secondary: "#f97316", // Orange
    dotPrimary: "#fca5a5", // Light red
    dotSecondary: "#fdba74", // Light orange
    background: "#0f0a0a",
    glow: "#f87171",
    glowIntensity: 0.5,
  },
  lavender: {
    name: "Lavender",
    primary: "#a855f7", // Purple
    secondary: "#ec4899", // Pink
    dotPrimary: "#d8b4fe", // Light purple
    dotSecondary: "#f9a8d4", // Light pink
    background: "#0f0a0f",
    glow: "#c084fc",
    glowIntensity: 0.45,
  },
  ice: {
    name: "Ice",
    primary: "#e2e8f0", // Slate 200
    secondary: "#94a3b8", // Slate 400
    dotPrimary: "#f8fafc", // Slate 50
    dotSecondary: "#cbd5e1", // Slate 300
    background: "#0a0a0c",
    glow: "#e2e8f0",
    glowIntensity: 0.3,
  },
  classic: {
    name: "Classic",
    primary: "#ffffff",
    secondary: "#ffffff",
    dotPrimary: "#ffffff",
    dotSecondary: "#ffffff",
    background: "#0a0a0a",
    glow: "#ffffff",
    glowIntensity: 0.2,
  },
};

/**
 * Default synth settings
 */
export const DEFAULT_SYNTH_SETTINGS: SynthSettings = {
  colorScheme: COLOR_SCHEMES.aurora,
  polarMode: "circle",
  petalConfig: {
    petalCount: 4,
    openness: 0.5,
    rotation: 0,
  },
  polarOscillator: {
    enabled: false,
    targets: [1, 2, 4],
    speed: 0.25,
    easing: "sine",
  },
  orbitOscillator: {
    enabled: false,
    amount: 0.5,
    minRadius: -1.5,
    maxRadius: 1.5,
    division: 4,
    phaseOffset: 0,
    waveform: "sine",
  },
  lineWidth: 2,
  lineSoftness: 0.3,
  rotationAmount: 1,
};

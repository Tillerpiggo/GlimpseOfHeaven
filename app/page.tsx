"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type DragState = {
  row: string;
  value: boolean;
} | null;

type ChannelState = {
  mute: boolean;
  solo: boolean;
};

// Available row types for the sequencer
type RowType =
  | "direction"
  | "circles1Visible"
  | "circles2Visible"
  | "circles1Position"
  | "circles2Position"
  | "circlesGrowth"
  | "tilt3D";

// Row configuration for display
type RowConfig = {
  id: string;
  type: RowType;
};

// Row type metadata
const ROW_TYPE_INFO: Record<RowType, { label: string; hitSymbol: string; hitColor: string; description: string }> = {
  direction: { label: "Direction", hitSymbol: "↺", hitColor: "bg-cyan-600 hover:bg-cyan-500", description: "Reverse orbit direction" },
  circles1Visible: { label: "C1 Vis", hitSymbol: "●", hitColor: "bg-blue-600 hover:bg-blue-500", description: "Toggle circle set 1 visibility" },
  circles2Visible: { label: "C2 Vis", hitSymbol: "●", hitColor: "bg-blue-600 hover:bg-blue-500", description: "Toggle circle set 2 visibility" },
  circles1Position: { label: "C1 Pos", hitSymbol: "⇄", hitColor: "bg-orange-600 hover:bg-orange-500", description: "Toggle circle set 1 position" },
  circles2Position: { label: "C2 Pos", hitSymbol: "⇄", hitColor: "bg-orange-600 hover:bg-orange-500", description: "Toggle circle set 2 position" },
  circlesGrowth: { label: "Growth", hitSymbol: "↗", hitColor: "bg-green-600 hover:bg-green-500", description: "Toggle expanding circles" },
  tilt3D: { label: "3D Rotate", hitSymbol: "◇", hitColor: "bg-pink-600 hover:bg-pink-500", description: "Toggle 3D rotation" },
};

type PatternLengths = {
  direction: number;
  circles1Visible: number;
  circles2Visible: number;
  circles1Position: number;
  circles2Position: number;
  circlesGrowth: number;
  tilt3D: number;
};

// A Pattern contains all the sequencer data for one "section" of a song
type PatternData = {
  id: string;
  name: string;
  bars: number; // Length in bars (default 4)
  // Patterns (all boolean - true = toggle/hit)
  directionPattern: boolean[];
  circles1VisiblePattern: boolean[];
  circles2VisiblePattern: boolean[];
  circles1PositionPattern: boolean[];
  circles2PositionPattern: boolean[];
  circlesGrowthPattern: boolean[];
  tilt3DPattern: boolean[];
  // Subdivisions (playback speed)
  subdivisions: {
    direction: number;
    circles1Visible: number;
    circles2Visible: number;
    circles1Position: number;
    circles2Position: number;
    circlesGrowth: number;
    tilt3D: number;
  };
  // Pattern lengths
  patternLengths: PatternLengths;
};

// An arrangement clip is a reference to a pattern at a specific position in the timeline
type ArrangementClip = {
  id: string;
  patternId: string;
  startBar: number; // Which bar does this clip start at
  length: number; // How many bars (can differ from pattern.bars for looping/truncating)
};

type RhythmData = {
  id: string;
  name: string;
  createdAt: number;
  // Global Settings
  orbitRadius: number;
  bpm: number;
  circleRadius: number;
  dotSize: number;
  numCircles: number;
  circleSpacing: number;
  // Growth rate (circles per revolution)
  growthRate: number;
  // Tilt amount (max tilt angle in degrees)
  tiltAmount: number;
  // Channel states (applies to all patterns)
  channelStates: Record<string, ChannelState>;
  // Pattern library
  patterns: PatternData[];
  // Arrangement timeline
  arrangement: ArrangementClip[];
  // --- Legacy fields for backwards compatibility ---
  // These are only used when loading old saved rhythms
  directionPattern?: boolean[];
  circles1VisiblePattern?: boolean[];
  circles2VisiblePattern?: boolean[];
  circles1PositionPattern?: boolean[];
  circles2PositionPattern?: boolean[];
  circlesGrowthPattern?: boolean[];
  tilt3DPattern?: boolean[];
  subdivisions?: {
    direction: number;
    circles1Visible: number;
    circles2Visible: number;
    circles1Position: number;
    circles2Position: number;
    circlesGrowth: number;
    tilt3D: number;
  };
  patternLengths?: PatternLengths;
};

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Default pattern lengths
const defaultPatternLengths: PatternLengths = {
  direction: 16,
  circles1Visible: 16,
  circles2Visible: 16,
  circles1Position: 16,
  circles2Position: 16,
  circlesGrowth: 16,
  tilt3D: 16,
};

// Default subdivisions
const defaultSubdivisions = {
  direction: 1,
  circles1Visible: 1,
  circles2Visible: 1,
  circles1Position: 1,
  circles2Position: 1,
  circlesGrowth: 1,
  tilt3D: 1,
};

// Create a default pattern
const createDefaultPattern = (name: string = "Pattern 1"): PatternData => ({
  id: generateId(),
  name,
  bars: 4,
  directionPattern: Array(16).fill(false),
  circles1VisiblePattern: Array(16).fill(true),
  circles2VisiblePattern: Array(16).fill(true),
  circles1PositionPattern: Array(16).fill(false),
  circles2PositionPattern: Array(16).fill(false),
  circlesGrowthPattern: Array(16).fill(false),
  tilt3DPattern: Array(16).fill(false),
  subdivisions: { ...defaultSubdivisions },
  patternLengths: { ...defaultPatternLengths },
});

// Migrate old rhythm data to new format (converts legacy patterns to PatternData)
const migrateRhythmData = (rhythm: RhythmData): RhythmData => {
  if (rhythm.patterns && rhythm.patterns.length > 0) {
    return rhythm; // Already migrated
  }

  // Create a pattern from legacy fields
  const legacyPattern: PatternData = {
    id: generateId(),
    name: "Pattern 1",
    bars: 4,
    directionPattern: rhythm.directionPattern || Array(16).fill(false),
    circles1VisiblePattern: rhythm.circles1VisiblePattern || Array(16).fill(true),
    circles2VisiblePattern: rhythm.circles2VisiblePattern || Array(16).fill(true),
    circles1PositionPattern: rhythm.circles1PositionPattern || Array(16).fill(false),
    circles2PositionPattern: rhythm.circles2PositionPattern || Array(16).fill(false),
    circlesGrowthPattern: rhythm.circlesGrowthPattern || Array(16).fill(false),
    tilt3DPattern: rhythm.tilt3DPattern || Array(16).fill(false),
    subdivisions: rhythm.subdivisions || { ...defaultSubdivisions },
    patternLengths: rhythm.patternLengths || { ...defaultPatternLengths },
  };

  return {
    ...rhythm,
    patterns: [legacyPattern],
    arrangement: [{ id: generateId(), patternId: legacyPattern.id, startBar: 0, length: 4 }],
  };
};

// Helper to create a default beat with the new structure
const createDefaultBeat = (config: {
  name: string;
  orbitRadius: number;
  bpm: number;
  circleRadius: number;
  dotSize: number;
  numCircles: number;
  circleSpacing: number;
  growthRate: number;
  tiltAmount: number;
  channelStates: Record<string, ChannelState>;
  pattern: Omit<PatternData, "id">;
}): Omit<RhythmData, "id" | "createdAt"> => {
  const patternId = generateId();
  return {
    name: config.name,
    orbitRadius: config.orbitRadius,
    bpm: config.bpm,
    circleRadius: config.circleRadius,
    dotSize: config.dotSize,
    numCircles: config.numCircles,
    circleSpacing: config.circleSpacing,
    growthRate: config.growthRate,
    tiltAmount: config.tiltAmount,
    channelStates: config.channelStates,
    patterns: [{ ...config.pattern, id: patternId }],
    arrangement: [{ id: generateId(), patternId, startBar: 0, length: config.pattern.bars }],
  };
};

const defaultChannelStates = {
  direction: { mute: false, solo: false },
  circles1Visible: { mute: false, solo: false },
  circles2Visible: { mute: false, solo: false },
  circles1Position: { mute: false, solo: false },
  circles2Position: { mute: false, solo: false },
  circlesGrowth: { mute: false, solo: false },
  tilt3D: { mute: false, solo: false },
};

// Default beats
const defaultBeats: Omit<RhythmData, "id" | "createdAt">[] = [
  createDefaultBeat({
    name: "Hypnotic Pulse",
    orbitRadius: 250,
    bpm: 76,
    circleRadius: 150,
    dotSize: 16,
    numCircles: 12,
    circleSpacing: 100,
    growthRate: 1,
    tiltAmount: 45,
    channelStates: { ...defaultChannelStates },
    pattern: {
      name: "Main",
      bars: 4,
      directionPattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      circles1VisiblePattern: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
      circles2VisiblePattern: [false, false, false, false, false, false, false, false, true, true, true, true, true, true, true, true],
      circles1PositionPattern: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      circles2PositionPattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      circlesGrowthPattern: Array(16).fill(false),
      tilt3DPattern: Array(16).fill(false),
      subdivisions: { ...defaultSubdivisions },
      patternLengths: { ...defaultPatternLengths },
    },
  }),
  createDefaultBeat({
    name: "Breathing Cosmos",
    orbitRadius: 200,
    bpm: 60,
    circleRadius: 120,
    dotSize: 20,
    numCircles: 15,
    circleSpacing: 80,
    growthRate: 1,
    tiltAmount: 30,
    channelStates: { ...defaultChannelStates },
    pattern: {
      name: "Main",
      bars: 4,
      directionPattern: [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
      circles1VisiblePattern: Array(16).fill(true),
      circles2VisiblePattern: Array(16).fill(true),
      circles1PositionPattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      circles2PositionPattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      circlesGrowthPattern: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      tilt3DPattern: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      subdivisions: { ...defaultSubdivisions },
      patternLengths: { ...defaultPatternLengths },
    },
  }),
  createDefaultBeat({
    name: "Glitch Storm",
    orbitRadius: 180,
    bpm: 140,
    circleRadius: 100,
    dotSize: 12,
    numCircles: 20,
    circleSpacing: 60,
    growthRate: 2,
    tiltAmount: 60,
    channelStates: { ...defaultChannelStates },
    pattern: {
      name: "Main",
      bars: 4,
      directionPattern: [true, false, true, false, false, true, false, false, true, false, false, true, false, true, false, false],
      circles1VisiblePattern: [true, true, false, true, true, false, true, true, false, true, true, false, true, true, false, true],
      circles2VisiblePattern: [false, true, true, false, true, true, false, true, true, false, true, true, false, true, true, false],
      circles1PositionPattern: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      circles2PositionPattern: [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true],
      circlesGrowthPattern: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      tilt3DPattern: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      subdivisions: { direction: 2, circles1Visible: 2, circles2Visible: 2, circles1Position: 2, circles2Position: 2, circlesGrowth: 1, tilt3D: 2 },
      patternLengths: { ...defaultPatternLengths },
    },
  }),
  createDefaultBeat({
    name: "Zen Garden",
    orbitRadius: 300,
    bpm: 45,
    circleRadius: 200,
    dotSize: 24,
    numCircles: 8,
    circleSpacing: 150,
    growthRate: 0.5,
    tiltAmount: 20,
    channelStates: {
      ...defaultChannelStates,
      circles2Visible: { mute: true, solo: false },
      circles2Position: { mute: true, solo: false },
    },
    pattern: {
      name: "Main",
      bars: 4,
      directionPattern: Array(16).fill(false),
      circles1VisiblePattern: Array(16).fill(true),
      circles2VisiblePattern: Array(16).fill(false),
      circles1PositionPattern: [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
      circles2PositionPattern: Array(16).fill(false),
      circlesGrowthPattern: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      tilt3DPattern: Array(16).fill(false),
      subdivisions: { ...defaultSubdivisions },
      patternLengths: { ...defaultPatternLengths },
    },
  }),
  createDefaultBeat({
    name: "Techno Orbit",
    orbitRadius: 220,
    bpm: 128,
    circleRadius: 130,
    dotSize: 14,
    numCircles: 16,
    circleSpacing: 70,
    growthRate: 1,
    tiltAmount: 45,
    channelStates: { ...defaultChannelStates },
    pattern: {
      name: "Main",
      bars: 4,
      directionPattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      circles1VisiblePattern: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      circles2VisiblePattern: [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true],
      circles1PositionPattern: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      circles2PositionPattern: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      circlesGrowthPattern: Array(16).fill(false),
      tilt3DPattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      subdivisions: { direction: 1, circles1Visible: 2, circles2Visible: 2, circles1Position: 1, circles2Position: 1, circlesGrowth: 1, tilt3D: 1 },
      patternLengths: { ...defaultPatternLengths },
    },
  }),
];

const loadRhythms = (): RhythmData[] => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem("orbitalRhythms");
  return saved ? JSON.parse(saved) : [];
};

const saveRhythms = (rhythms: RhythmData[]) => {
  localStorage.setItem("orbitalRhythms", JSON.stringify(rhythms));
};

// IndexedDB helpers for audio files
const DB_NAME = "orbitalCirclesDB";
const DB_VERSION = 1;
const AUDIO_STORE = "audioFiles";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: "id" });
      }
    };
  });
};

const saveAudioToDB = async (id: string, audioBlob: Blob, fileName: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readwrite");
    const store = transaction.objectStore(AUDIO_STORE);
    const request = store.put({ id, blob: audioBlob, fileName, timestamp: Date.now() });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const loadAudioFromDB = async (id: string): Promise<{ blob: Blob; fileName: string } | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readonly");
    const store = transaction.objectStore(AUDIO_STORE);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (request.result) {
        resolve({ blob: request.result.blob, fileName: request.result.fileName });
      } else {
        resolve(null);
      }
    };
  });
};

const deleteAudioFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readwrite");
    const store = transaction.objectStore(AUDIO_STORE);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const barDisplayRef = useRef<HTMLSpanElement>(null);
  const arrangementBarRef = useRef<number>(0);

  // App state
  const [view, setView] = useState<"home" | "editor">("home");
  const [savedRhythms, setSavedRhythms] = useState<RhythmData[]>([]);
  const [currentRhythmId, setCurrentRhythmId] = useState<string | null>(null);
  const [rhythmName, setRhythmName] = useState("Untitled");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pattern and arrangement state
  const [patterns, setPatterns] = useState<PatternData[]>([createDefaultPattern("Pattern 1")]);
  const [currentPatternId, setCurrentPatternId] = useState<string>(patterns[0]?.id || "");
  const [arrangement, setArrangement] = useState<ArrangementClip[]>([]);
  const [arrangementExpanded, setArrangementExpanded] = useState(false);

  // Dynamic rows configuration
  const [visibleRows, setVisibleRows] = useState<RowConfig[]>([
    { id: generateId(), type: "direction" },
    { id: generateId(), type: "circles1Visible" },
    { id: generateId(), type: "circles2Visible" },
    { id: generateId(), type: "circles1Position" },
    { id: generateId(), type: "circles2Position" },
    { id: generateId(), type: "circlesGrowth" },
    { id: generateId(), type: "tilt3D" },
  ]);
  const [showAddRowMenu, setShowAddRowMenu] = useState(false);

  // Resizable panel sizes
  const [controlsPanelWidth, setControlsPanelWidth] = useState(280);
  const [drumMachineHeight, setDrumMachineHeight] = useState(300);
  const [arrangementHeight, setArrangementHeight] = useState(150);
  const [isResizing, setIsResizing] = useState<"controls" | "drumMachine" | "arrangement" | null>(null);
  const resizeStartRef = useRef<{ pos: number; size: number }>({ pos: 0, size: 0 });

  // Audio player state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncOffset, setSyncOffset] = useState(0); // Seconds into audio to sync with animation start

  // Arrangement playback state
  const [useArrangement, setUseArrangement] = useState(true); // Toggle between arrangement and single pattern mode

  // Adjustable properties
  const [orbitRadius, setOrbitRadius] = useState(250);
  const [bpm, setBpm] = useState(76);
  const [circleRadius, setCircleRadius] = useState(150);
  const [dotSize, setDotSize] = useState(16);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [drumMachineExpanded, setDrumMachineExpanded] = useState(true);
  const [cellWidth, setCellWidth] = useState(28); // Base cell width in pixels

  // Concentric circles properties
  const [numCircles, setNumCircles] = useState(12);
  const [circleSpacing, setCircleSpacing] = useState(100);

  // Base pattern length (16 steps = 8 rotations at 1x)
  const basePatternLength = 16;
  // Subdivision options: affects how fast the pattern plays (higher = faster)
  const subdivisionOptions = [0.25, 0.5, 1, 2, 4];
  // Pattern length options
  const patternLengthOptions = [4, 8, 16, 32, 64];

  // Pattern lengths per row
  const [patternLengths, setPatternLengths] = useState<PatternLengths>({
    direction: 16,
    circles1Visible: 16,
    circles2Visible: 16,
    circles1Position: 16,
    circles2Position: 16,
    circlesGrowth: 16,
    tilt3D: 16,
  });

  // Helper to resize pattern when length changes
  const resizePattern = (pattern: boolean[], newLength: number): boolean[] => {
    if (pattern.length === newLength) return pattern;
    const newPattern: boolean[] = [];
    for (let i = 0; i < newLength; i++) {
      // Repeat or truncate pattern
      newPattern.push(pattern[i % pattern.length] ?? false);
    }
    return newPattern;
  };

  // All patterns are now boolean (true = toggle/hit)
  const [directionPattern, setDirectionPattern] = useState<boolean[]>([
    false, false, false, false, true, false, false, false,
    false, false, false, false, true, false, false, false,
  ]);

  const [circles1VisiblePattern, setCircles1VisiblePattern] = useState<boolean[]>([
    true, true, true, true, true, true, true, true,
    true, true, true, true, true, true, true, true,
  ]);

  const [circles2VisiblePattern, setCircles2VisiblePattern] = useState<boolean[]>([
    true, true, true, true, true, true, true, true,
    false, false, false, false, false, false, false, false,
  ]);

  // Position patterns: true = toggle between Dot and Midpoint
  const [circles1PositionPattern, setCircles1PositionPattern] = useState<boolean[]>([
    false, false, true, false, false, false, true, false,
    false, false, true, false, false, false, true, false,
  ]);

  const [circles2PositionPattern, setCircles2PositionPattern] = useState<boolean[]>([
    false, false, true, false, false, false, true, false,
    false, false, true, false, false, false, true, false,
  ]);

  // Circles growth pattern: true = toggle growth mode on/off
  const [circlesGrowthPattern, setCirclesGrowthPattern] = useState<boolean[]>([
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false,
  ]);

  // Growth rate: circles spacing per revolution (1 = one spacing unit per full rotation)
  const [growthRate, setGrowthRate] = useState(1);

  // 3D Tilt pattern: true = toggle tilt mode on/off
  const [tilt3DPattern, setTilt3DPattern] = useState<boolean[]>([
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false,
  ]);

  // Tilt amount in degrees
  const [tiltAmount, setTiltAmount] = useState(45);

  const [subdivisions, setSubdivisions] = useState({
    direction: 1,
    circles1Visible: 1,
    circles2Visible: 1,
    circles1Position: 1,
    circles2Position: 1,
    circlesGrowth: 1,
    tilt3D: 1,
  });

  const [channelStates, setChannelStates] = useState<Record<string, ChannelState>>({
    direction: { mute: false, solo: false },
    circles1Visible: { mute: false, solo: false },
    circles2Visible: { mute: false, solo: false },
    circles1Position: { mute: false, solo: false },
    circles2Position: { mute: false, solo: false },
    circlesGrowth: { mute: false, solo: false },
    tilt3D: { mute: false, solo: false },
  });

  const anySoloed = Object.values(channelStates).some(s => s.solo);

  const isChannelActive = useCallback((channel: string): boolean => {
    const state = channelStates[channel];
    if (!state) return true;
    if (state.mute && !state.solo) return false;
    if (anySoloed && !state.solo) return false;
    return true;
  }, [channelStates, anySoloed]);

  const toggleMute = (channel: string) => {
    setChannelStates(prev => ({
      ...prev,
      [channel]: { ...prev[channel], mute: !prev[channel].mute }
    }));
  };

  const toggleSolo = (channel: string) => {
    setChannelStates(prev => ({
      ...prev,
      [channel]: { ...prev[channel], solo: !prev[channel].solo }
    }));
  };

  const [dragState, setDragState] = useState<DragState>(null);

  // Load saved rhythms on mount
  useEffect(() => {
    setSavedRhythms(loadRhythms());
  }, []);

  // Helper to get current pattern data from editing state
  const getCurrentPatternData = useCallback((): PatternData => ({
    id: currentPatternId,
    name: patterns.find(p => p.id === currentPatternId)?.name || "Pattern 1",
    bars: patterns.find(p => p.id === currentPatternId)?.bars || 4,
    directionPattern,
    circles1VisiblePattern,
    circles2VisiblePattern,
    circles1PositionPattern,
    circles2PositionPattern,
    circlesGrowthPattern,
    tilt3DPattern,
    subdivisions,
    patternLengths,
  }), [currentPatternId, patterns, directionPattern, circles1VisiblePattern, circles2VisiblePattern,
       circles1PositionPattern, circles2PositionPattern, circlesGrowthPattern, tilt3DPattern,
       subdivisions, patternLengths]);

  // Helper to build rhythm data for saving
  const buildRhythmData = useCallback((): RhythmData => {
    const currentPattern = getCurrentPatternData();
    // Update patterns array with current editing state
    const updatedPatterns = patterns.map(p =>
      p.id === currentPatternId ? currentPattern : p
    );
    // Ensure arrangement has at least one clip if empty
    const currentArrangement = arrangement.length > 0 ? arrangement : [
      { id: generateId(), patternId: currentPatternId, startBar: 0, length: currentPattern.bars }
    ];

    return {
      id: currentRhythmId || generateId(),
      name: rhythmName,
      createdAt: Date.now(),
      orbitRadius,
      bpm,
      circleRadius,
      dotSize,
      numCircles,
      circleSpacing,
      growthRate,
      tiltAmount,
      channelStates,
      patterns: updatedPatterns,
      arrangement: currentArrangement,
    };
  }, [getCurrentPatternData, patterns, currentPatternId, arrangement, currentRhythmId,
      rhythmName, orbitRadius, bpm, circleRadius, dotSize, numCircles, circleSpacing,
      growthRate, tiltAmount, channelStates]);

  // Autosave - save current rhythm every 3 seconds when in editor
  useEffect(() => {
    if (view !== "editor") return;

    const autosaveInterval = setInterval(() => {
      // Only autosave if we have a rhythm name
      if (rhythmName && rhythmName !== "Untitled") {
        const rhythm = buildRhythmData();
        const existing = loadRhythms().filter(r => r.id !== rhythm.id);
        const updated = [...existing, rhythm];
        saveRhythms(updated);
        if (!currentRhythmId) {
          setCurrentRhythmId(rhythm.id);
        }
      }
    }, 3000);

    return () => clearInterval(autosaveInterval);
  }, [view, rhythmName, currentRhythmId, buildRhythmData]);

  // Save current rhythm
  const saveCurrentRhythm = async () => {
    const rhythm = buildRhythmData();

    const existing = savedRhythms.filter(r => r.id !== rhythm.id);
    const updated = [...existing, rhythm];
    setSavedRhythms(updated);
    saveRhythms(updated);
    setCurrentRhythmId(rhythm.id);

    // Save audio to IndexedDB if we have one
    if (audioBlobRef.current && audioFileName) {
      try {
        await saveAudioToDB(rhythm.id, audioBlobRef.current, audioFileName);
      } catch (err) {
        console.error("Failed to save audio to IndexedDB:", err);
      }
    }
  };

  // Clear audio state
  const clearAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioFileName("");
    audioBlobRef.current = null;
    setIsPlaying(false);
    setSyncOffset(0);
  };

  // Helper to load pattern data into editing state
  const loadPatternIntoEditor = (pattern: PatternData) => {
    setCurrentPatternId(pattern.id);
    setDirectionPattern(pattern.directionPattern);
    setCircles1VisiblePattern(pattern.circles1VisiblePattern);
    setCircles2VisiblePattern(pattern.circles2VisiblePattern);
    setCircles1PositionPattern(pattern.circles1PositionPattern);
    setCircles2PositionPattern(pattern.circles2PositionPattern);
    setCirclesGrowthPattern(pattern.circlesGrowthPattern);
    setTilt3DPattern(pattern.tilt3DPattern);
    setSubdivisions(pattern.subdivisions);
    setPatternLengths(pattern.patternLengths);
  };

  // Load a rhythm
  const loadRhythm = async (rhythm: RhythmData) => {
    // Migrate old format if needed
    const migrated = migrateRhythmData(rhythm);

    setCurrentRhythmId(migrated.id);
    setRhythmName(migrated.name);
    setOrbitRadius(migrated.orbitRadius);
    setBpm(migrated.bpm);
    setCircleRadius(migrated.circleRadius);
    setDotSize(migrated.dotSize);
    setNumCircles(migrated.numCircles);
    setCircleSpacing(migrated.circleSpacing);
    setGrowthRate(migrated.growthRate ?? 1);
    setTiltAmount(migrated.tiltAmount ?? 45);
    setChannelStates(migrated.channelStates);

    // Load patterns and arrangement
    setPatterns(migrated.patterns);
    setArrangement(migrated.arrangement);

    // Load first pattern into editor
    if (migrated.patterns.length > 0) {
      loadPatternIntoEditor(migrated.patterns[0]);
    }

    timeRef.current = 0;

    // Load audio from IndexedDB if available
    clearAudio();
    try {
      const audioData = await loadAudioFromDB(migrated.id);
      if (audioData) {
        const url = URL.createObjectURL(audioData.blob);
        setAudioUrl(url);
        setAudioFileName(audioData.fileName);
        audioBlobRef.current = audioData.blob;
      }
    } catch (err) {
      console.error("Failed to load audio from IndexedDB:", err);
    }

    setView("editor");
  };

  // Load a default beat
  const loadDefaultBeat = (beat: Omit<RhythmData, "id" | "createdAt">) => {
    setCurrentRhythmId(null);
    setRhythmName(beat.name);
    setOrbitRadius(beat.orbitRadius);
    setBpm(beat.bpm);
    setCircleRadius(beat.circleRadius);
    setDotSize(beat.dotSize);
    setNumCircles(beat.numCircles);
    setCircleSpacing(beat.circleSpacing);
    setGrowthRate(beat.growthRate);
    setTiltAmount(beat.tiltAmount);
    setChannelStates(beat.channelStates);

    // Load patterns and arrangement
    setPatterns(beat.patterns);
    setArrangement(beat.arrangement);

    // Load first pattern into editor
    if (beat.patterns.length > 0) {
      loadPatternIntoEditor(beat.patterns[0]);
    }

    clearAudio();
    timeRef.current = 0;
    setView("editor");
  };

  // Create new rhythm
  const createNewRhythm = () => {
    const newPattern = createDefaultPattern("Pattern 1");

    setCurrentRhythmId(null);
    setRhythmName("Untitled");
    setOrbitRadius(250);
    setBpm(76);
    setCircleRadius(150);
    setDotSize(16);
    setNumCircles(12);
    setCircleSpacing(100);
    setGrowthRate(1);
    setTiltAmount(45);
    setChannelStates({ ...defaultChannelStates });

    // Set up patterns and arrangement
    setPatterns([newPattern]);
    setArrangement([{ id: generateId(), patternId: newPattern.id, startBar: 0, length: 4 }]);

    // Load the new pattern into editor
    loadPatternIntoEditor(newPattern);

    clearAudio();
    timeRef.current = 0;
    setView("editor");
  };

  // Delete a rhythm
  const deleteRhythm = async (id: string) => {
    const updated = savedRhythms.filter(r => r.id !== id);
    setSavedRhythms(updated);
    saveRhythms(updated);

    // Also delete associated audio from IndexedDB
    try {
      await deleteAudioFromDB(id);
    } catch (err) {
      console.error("Failed to delete audio from IndexedDB:", err);
    }
  };

  // Pattern management functions
  const addNewPattern = () => {
    // Save current pattern first
    const updatedPatterns = patterns.map(p =>
      p.id === currentPatternId ? getCurrentPatternData() : p
    );
    const newPattern = createDefaultPattern(`Pattern ${patterns.length + 1}`);
    setPatterns([...updatedPatterns, newPattern]);
    loadPatternIntoEditor(newPattern);
  };

  const duplicatePattern = () => {
    const currentPattern = getCurrentPatternData();
    const newPattern: PatternData = {
      ...currentPattern,
      id: generateId(),
      name: `${currentPattern.name} (copy)`,
    };
    // Save current pattern first
    const updatedPatterns = patterns.map(p =>
      p.id === currentPatternId ? currentPattern : p
    );
    setPatterns([...updatedPatterns, newPattern]);
    loadPatternIntoEditor(newPattern);
  };

  const deletePattern = (patternId: string) => {
    if (patterns.length <= 1) return; // Keep at least one pattern
    const updatedPatterns = patterns.filter(p => p.id !== patternId);
    setPatterns(updatedPatterns);
    // Remove clips referencing this pattern
    setArrangement(arrangement.filter(c => c.patternId !== patternId));
    // Switch to first pattern if we deleted current
    if (patternId === currentPatternId && updatedPatterns.length > 0) {
      loadPatternIntoEditor(updatedPatterns[0]);
    }
  };

  const renamePattern = (patternId: string, newName: string) => {
    setPatterns(patterns.map(p =>
      p.id === patternId ? { ...p, name: newName } : p
    ));
  };

  const switchToPattern = (patternId: string) => {
    // Save current pattern first
    setPatterns(patterns.map(p =>
      p.id === currentPatternId ? getCurrentPatternData() : p
    ));
    const pattern = patterns.find(p => p.id === patternId);
    if (pattern) {
      loadPatternIntoEditor(pattern);
    }
  };

  // Arrangement management functions
  const addClipToArrangement = (patternId: string) => {
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern) return;
    // Find the end of the current arrangement
    const endBar = arrangement.reduce((max, clip) => Math.max(max, clip.startBar + clip.length), 0);
    const newClip: ArrangementClip = {
      id: generateId(),
      patternId,
      startBar: endBar,
      length: pattern.bars,
    };
    setArrangement([...arrangement, newClip]);
  };

  const removeClipFromArrangement = (clipId: string) => {
    setArrangement(arrangement.filter(c => c.id !== clipId));
  };

  const moveClip = (clipId: string, newStartBar: number) => {
    setArrangement(arrangement.map(c =>
      c.id === clipId ? { ...c, startBar: Math.max(0, newStartBar) } : c
    ));
  };

  // Row management functions
  const addRow = (type: RowType) => {
    setVisibleRows([...visibleRows, { id: generateId(), type }]);
    setShowAddRowMenu(false);
  };

  const removeRow = (rowId: string) => {
    setVisibleRows(visibleRows.filter(r => r.id !== rowId));
  };

  const moveRowUp = (rowId: string) => {
    const idx = visibleRows.findIndex(r => r.id === rowId);
    if (idx <= 0) return;
    const newRows = [...visibleRows];
    [newRows[idx - 1], newRows[idx]] = [newRows[idx], newRows[idx - 1]];
    setVisibleRows(newRows);
  };

  const moveRowDown = (rowId: string) => {
    const idx = visibleRows.findIndex(r => r.id === rowId);
    if (idx < 0 || idx >= visibleRows.length - 1) return;
    const newRows = [...visibleRows];
    [newRows[idx], newRows[idx + 1]] = [newRows[idx + 1], newRows[idx]];
    setVisibleRows(newRows);
  };

  // Helper to get pattern and setter for a row type
  const getPatternForType = (type: RowType): { pattern: boolean[]; setPattern: (p: boolean[]) => void } => {
    switch (type) {
      case "direction": return { pattern: directionPattern, setPattern: setDirectionPattern };
      case "circles1Visible": return { pattern: circles1VisiblePattern, setPattern: setCircles1VisiblePattern };
      case "circles2Visible": return { pattern: circles2VisiblePattern, setPattern: setCircles2VisiblePattern };
      case "circles1Position": return { pattern: circles1PositionPattern, setPattern: setCircles1PositionPattern };
      case "circles2Position": return { pattern: circles2PositionPattern, setPattern: setCircles2PositionPattern };
      case "circlesGrowth": return { pattern: circlesGrowthPattern, setPattern: setCirclesGrowthPattern };
      case "tilt3D": return { pattern: tilt3DPattern, setPattern: setTilt3DPattern };
    }
  };

  // Resize handlers
  const handleResizeStart = (type: "controls" | "drumMachine" | "arrangement", e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(type);
    const currentSize = type === "controls" ? controlsPanelWidth :
                       type === "drumMachine" ? drumMachineHeight : arrangementHeight;
    const pos = type === "controls" ? e.clientX : e.clientY;
    resizeStartRef.current = { pos, size: currentSize };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { pos: startPos, size: startSize } = resizeStartRef.current;
      if (isResizing === "controls") {
        const delta = e.clientX - startPos;
        setControlsPanelWidth(Math.max(200, Math.min(500, startSize + delta)));
      } else if (isResizing === "drumMachine") {
        const delta = startPos - e.clientY; // Inverted because dragging up should increase
        setDrumMachineHeight(Math.max(100, Math.min(600, startSize + delta)));
      } else if (isResizing === "arrangement") {
        const delta = startPos - e.clientY;
        setArrangementHeight(Math.max(80, Math.min(400, startSize + delta)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Arrangement playback helpers
  const getActiveClip = useCallback((barPosition: number): ArrangementClip | null => {
    if (arrangement.length === 0) return null;
    // Find clip that contains this bar position
    for (const clip of arrangement) {
      if (barPosition >= clip.startBar && barPosition < clip.startBar + clip.length) {
        return clip;
      }
    }
    return null;
  }, [arrangement]);

  const getArrangementLength = useCallback((): number => {
    if (arrangement.length === 0) return 0;
    return Math.max(...arrangement.map(c => c.startBar + c.length));
  }, [arrangement]);

  const getPatternById = useCallback((patternId: string): PatternData | null => {
    return patterns.find(p => p.id === patternId) || null;
  }, [patterns]);

  // Get the pattern data to use for a given row type at current playback position
  const getActivePatternForType = useCallback((type: RowType, barInArrangement: number): boolean[] => {
    if (!useArrangement || arrangement.length === 0) {
      // Use current editor state
      return getPatternForType(type).pattern;
    }

    const activeClip = getActiveClip(barInArrangement);
    if (!activeClip) {
      // No clip at this position, return empty pattern
      return Array(16).fill(false);
    }

    const pattern = getPatternById(activeClip.patternId);
    if (!pattern) {
      return Array(16).fill(false);
    }

    // Return the appropriate pattern array from the pattern data
    switch (type) {
      case "direction": return pattern.directionPattern;
      case "circles1Visible": return pattern.circles1VisiblePattern;
      case "circles2Visible": return pattern.circles2VisiblePattern;
      case "circles1Position": return pattern.circles1PositionPattern;
      case "circles2Position": return pattern.circles2PositionPattern;
      case "circlesGrowth": return pattern.circlesGrowthPattern;
      case "tilt3D": return pattern.tilt3DPattern;
    }
  }, [useArrangement, arrangement, getActiveClip, getPatternById, getPatternForType]);

  const getActiveSubdivisionsForType = useCallback((type: RowType, barInArrangement: number): number => {
    if (!useArrangement || arrangement.length === 0) {
      return subdivisions[type];
    }

    const activeClip = getActiveClip(barInArrangement);
    if (!activeClip) return 1;

    const pattern = getPatternById(activeClip.patternId);
    if (!pattern) return 1;

    return pattern.subdivisions[type];
  }, [useArrangement, arrangement, getActiveClip, getPatternById, subdivisions]);

  const getActivePatternLengthForType = useCallback((type: RowType, barInArrangement: number): number => {
    if (!useArrangement || arrangement.length === 0) {
      return patternLengths[type];
    }

    const activeClip = getActiveClip(barInArrangement);
    if (!activeClip) return 16;

    const pattern = getPatternById(activeClip.patternId);
    if (!pattern) return 16;

    return pattern.patternLengths[type];
  }, [useArrangement, arrangement, getActiveClip, getPatternById, patternLengths]);

  // Animation
  useEffect(() => {
    if (view !== "editor") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    let lastTime = performance.now();

    // Get pattern index based on half-rotations
    // Subdivision makes patterns play FASTER - 2x subdivision means 2x speed
    // Pattern completes in (baseLength) half-rotations regardless of subdivision
    const getPatternIndex = (pattern: boolean[], totalHalfRots: number, baseLength: number): { idx: number; progress: number } => {
      // Scale: pattern.length cells complete in baseLength half-rotations
      const scaleFactor = pattern.length / baseLength;
      const scaledTime = totalHalfRots * scaleFactor;
      const idx = Math.floor(scaledTime) % pattern.length;
      const progress = scaledTime % 1;
      return { idx, progress };
    };

    // Count how many cells have been passed (for toggle counting)
    const getPassedCellCount = (pattern: boolean[], totalHalfRots: number, baseLength: number): number => {
      const scaleFactor = pattern.length / baseLength;
      return Math.floor(totalHalfRots * scaleFactor);
    };

    // Check if pattern has a hit at a specific cell index
    const cellHasHit = (pattern: boolean[], cellIndex: number): boolean => {
      return pattern[cellIndex % pattern.length];
    };

    // Efficiently count toggles using modular arithmetic (O(patternLength) instead of O(passedCells))
    const countTogglesEfficient = (pattern: boolean[], passedCells: number): number => {
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
    };

    // Calculate cumulative angle for direction pattern efficiently
    const calculateDirectionAngle = (pattern: boolean[], passedCells: number, halfRotsPerCell: number, halfRotation: number, active: boolean): { angle: number; currentDir: boolean } => {
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
      let currentDir = (countTogglesEfficient(pattern, completeCycles * patternLen) % 2 === 0);
      for (let i = 0; i < remainder; i++) {
        if (pattern[i]) currentDir = !currentDir;
        angle += currentDir ? halfRotsPerCell * halfRotation : -halfRotsPerCell * halfRotation;
      }
      return { angle, currentDir };
    };

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      timeRef.current += deltaTime;

      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      const baseAngle = timeRef.current * (bpm / 60) * Math.PI;

      // Calculate current bar position (4 beats per bar, at current BPM)
      const beatsElapsed = timeRef.current * (bpm / 60);
      const currentBar = beatsElapsed / 4; // 4 beats per bar
      const arrangementLen = getArrangementLength();

      // Loop arrangement if needed
      let effectiveBar = currentBar;
      if (useArrangement && arrangementLen > 0) {
        effectiveBar = currentBar % arrangementLen;
      }

      // Update bar display via refs (no React re-render)
      arrangementBarRef.current = effectiveBar;
      if (playheadRef.current) {
        playheadRef.current.style.left = `${effectiveBar * 32}px`;
      }
      if (barDisplayRef.current) {
        barDisplayRef.current.textContent = effectiveBar.toFixed(1);
      }

      // Get active patterns - use editor state directly when not using arrangement
      const activeDirectionPattern = useArrangement ? getActivePatternForType("direction", effectiveBar) : directionPattern;
      const activeCircles1VisiblePattern = useArrangement ? getActivePatternForType("circles1Visible", effectiveBar) : circles1VisiblePattern;
      const activeCircles2VisiblePattern = useArrangement ? getActivePatternForType("circles2Visible", effectiveBar) : circles2VisiblePattern;
      const activeCircles1PositionPattern = useArrangement ? getActivePatternForType("circles1Position", effectiveBar) : circles1PositionPattern;
      const activeCircles2PositionPattern = useArrangement ? getActivePatternForType("circles2Position", effectiveBar) : circles2PositionPattern;
      const activeCirclesGrowthPattern = useArrangement ? getActivePatternForType("circlesGrowth", effectiveBar) : circlesGrowthPattern;
      const activeTilt3DPattern = useArrangement ? getActivePatternForType("tilt3D", effectiveBar) : tilt3DPattern;

      // Get active pattern lengths - use editor state directly when not using arrangement
      const activePatternLengths = useArrangement ? {
        direction: getActivePatternLengthForType("direction", effectiveBar),
        circles1Visible: getActivePatternLengthForType("circles1Visible", effectiveBar),
        circles2Visible: getActivePatternLengthForType("circles2Visible", effectiveBar),
        circles1Position: getActivePatternLengthForType("circles1Position", effectiveBar),
        circles2Position: getActivePatternLengthForType("circles2Position", effectiveBar),
        circlesGrowth: getActivePatternLengthForType("circlesGrowth", effectiveBar),
        tilt3D: getActivePatternLengthForType("tilt3D", effectiveBar),
      } : patternLengths;

      const halfRotation = Math.PI;
      const totalHalfRotations = baseAngle / halfRotation;
      const stepProgress = totalHalfRotations % 1;
      const completedHalfRotations = Math.floor(totalHalfRotations);

      // Direction: use efficient calculation
      const directionActive = isChannelActive("direction");
      const dirBaseLen = activePatternLengths.direction;
      const dirScaleFactor = activeDirectionPattern.length / dirBaseLen;
      const dirPassedCells = getPassedCellCount(activeDirectionPattern, totalHalfRotations, dirBaseLen);
      const dirCurrentCell = dirPassedCells % activeDirectionPattern.length;
      const dirCellProgress = (totalHalfRotations * dirScaleFactor) % 1;
      const halfRotsPerCell = 1 / dirScaleFactor;

      // Use efficient O(patternLength) calculation instead of O(passedCells)
      const { angle: baseAngleCalc, currentDir } = calculateDirectionAngle(
        activeDirectionPattern, dirPassedCells, halfRotsPerCell, halfRotation, directionActive
      );
      // Add progress within current cell
      let currentDirection = currentDir;
      if (directionActive && cellHasHit(activeDirectionPattern, dirCurrentCell)) {
        currentDirection = !currentDirection;
      }
      const angle = baseAngleCalc + (currentDirection ? dirCellProgress * halfRotsPerCell * halfRotation : -dirCellProgress * halfRotsPerCell * halfRotation);

      const orbitingX = Math.cos(angle) * orbitRadius;
      const orbitingY = Math.sin(angle) * orbitRadius;

      const midpointX = orbitingX / 2;
      const midpointY = orbitingY / 2;
      const cameraX = width / 2 - midpointX;
      const cameraY = height / 2 - midpointY;

      const dot1ScreenX = cameraX;
      const dot1ScreenY = cameraY;
      const dot2ScreenX = cameraX + orbitingX;
      const dot2ScreenY = cameraY + orbitingY;

      // Visibility: current value in pattern
      const circles1VisActive = isChannelActive("circles1Visible");
      const circles2VisActive = isChannelActive("circles2Visible");
      const { idx: c1VisIdx } = getPatternIndex(activeCircles1VisiblePattern, totalHalfRotations, activePatternLengths.circles1Visible);
      const { idx: c2VisIdx } = getPatternIndex(activeCircles2VisiblePattern, totalHalfRotations, activePatternLengths.circles2Visible);
      const circles1Visible = circles1VisActive ? activeCircles1VisiblePattern[c1VisIdx] : true;
      const circles2Visible = circles2VisActive ? activeCircles2VisiblePattern[c2VisIdx] : true;

      // Position: count toggles to determine current state, with smooth transition
      const getPositionT = (pattern: boolean[], active: boolean, baseLength: number): number => {
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
      };

      const circles1PosActive = isChannelActive("circles1Position");
      const circles2PosActive = isChannelActive("circles2Position");
      const circles1T = getPositionT(activeCircles1PositionPattern, circles1PosActive, activePatternLengths.circles1Position);
      const circles2T = getPositionT(activeCircles2PositionPattern, circles2PosActive, activePatternLengths.circles2Position);

      // Circle growth: when enabled, circles continuously expand outward
      const circlesGrowthActive = isChannelActive("circlesGrowth");
      let growthOffset = 0;
      let growthEnabled = false;

      if (circlesGrowthActive) {
        const passedCells = getPassedCellCount(activeCirclesGrowthPattern, totalHalfRotations, activePatternLengths.circlesGrowth);
        const toggleCount = countTogglesEfficient(activeCirclesGrowthPattern, passedCells);
        growthEnabled = toggleCount % 2 === 1;

        if (growthEnabled) {
          const fullRotations = totalHalfRotations / 2;
          growthOffset = (fullRotations * growthRate * circleSpacing) % (numCircles * circleSpacing);
        }
      }

      // 3D Tilt: when enabled, continuously rotate in 3D space (synced with revolutions)
      const tilt3DActive = isChannelActive("tilt3D");
      let tiltEnabled = false;
      let currentTiltAngle = 0;

      if (tilt3DActive) {
        const passedCells = getPassedCellCount(activeTilt3DPattern, totalHalfRotations, activePatternLengths.tilt3D);
        const toggleCount = countTogglesEfficient(activeTilt3DPattern, passedCells);
        tiltEnabled = toggleCount % 2 === 1;

        if (tiltEnabled) {
          // Continuous rotation - keeps spinning at constant rate
          // Speed controlled by tiltAmount (45 = 1 full rotation per 2 orbit revolutions)
          currentTiltAngle = (totalHalfRotations / 4) * Math.PI * 2 * (tiltAmount / 45);
        }
      }

      // The axis of rotation is the line between the two dots
      // axisAngle is the angle of this line from horizontal
      const axisAngle = angle;

      // Helper to apply 3D perspective rotating around the dot-dot axis
      const applyPerspective = (x: number, y: number, pivotX: number, pivotY: number): { x: number; y: number; scale: number } => {
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
        const perspective = 1000;
        const scale = perspective / (perspective + depth);

        // Rotate back to screen coordinates
        const newRelX = rotatedPerpX * Math.cos(axisAngle) - alongAxis * Math.sin(axisAngle);
        const newRelY = rotatedPerpX * Math.sin(axisAngle) + alongAxis * Math.cos(axisAngle);

        return {
          x: pivotX + newRelX * scale,
          y: pivotY + newRelY * scale,
          scale: Math.max(0.3, scale)
        };
      };

      if (circles1Visible) {
        const center1X = dot1ScreenX + (width / 2 - dot1ScreenX) * circles1T;
        const center1Y = dot1ScreenY + (height / 2 - dot1ScreenY) * circles1T;
        const baseRadius1 = circleRadius + (orbitRadius / 2 - circleRadius) * circles1T;
        const maxRadius = baseRadius1 + (numCircles - 1) * circleSpacing;

        // Apply perspective to center point (rotating around dot-dot axis)
        const p1 = applyPerspective(center1X, center1Y, width / 2, height / 2);

        for (let i = numCircles; i >= 1; i--) {
          let radius = baseRadius1 + (i - 1) * circleSpacing;
          if (growthEnabled) {
            // Apply growth offset with wrapping
            radius = radius + growthOffset;
            // Wrap radius back to start if it exceeds max
            while (radius > maxRadius + circleSpacing) {
              radius -= numCircles * circleSpacing;
            }
            // Skip if radius is less than base (it will wrap around)
            if (radius < baseRadius1 * 0.5) continue;
          }
          const normalizedPos = (radius - baseRadius1) / (maxRadius - baseRadius1 + circleSpacing);
          const opacity = Math.max(0.2, 1 - normalizedPos * 0.7);
          const scaledRadius = Math.max(10, radius * p1.scale);

          ctx.beginPath();
          if (tiltEnabled) {
            // Draw ellipse for 3D effect - ellipse is oriented along the rotation axis
            // Minor axis (compressed) is perpendicular to the dot-dot axis
            const minorScale = Math.abs(Math.cos(currentTiltAngle));
            // The ellipse rotation matches the axis angle
            ctx.ellipse(p1.x, p1.y, scaledRadius * minorScale, scaledRadius, axisAngle, 0, Math.PI * 2);
          } else {
            ctx.arc(center1X, center1Y, scaledRadius, 0, Math.PI * 2);
          }
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * p1.scale})`;
          ctx.lineWidth = 2 * p1.scale;
          ctx.stroke();
        }
      }

      if (circles2Visible) {
        const center2X = dot2ScreenX + (width / 2 - dot2ScreenX) * circles2T;
        const center2Y = dot2ScreenY + (height / 2 - dot2ScreenY) * circles2T;
        const baseRadius2 = circleRadius + (orbitRadius / 2 - circleRadius) * circles2T;
        const maxRadius2 = baseRadius2 + (numCircles - 1) * circleSpacing;

        // Apply perspective to center point (rotating around dot-dot axis)
        const p2 = applyPerspective(center2X, center2Y, width / 2, height / 2);

        for (let i = numCircles; i >= 1; i--) {
          let radius = baseRadius2 + (i - 1) * circleSpacing;
          if (growthEnabled) {
            radius = radius + growthOffset;
            while (radius > maxRadius2 + circleSpacing) {
              radius -= numCircles * circleSpacing;
            }
            if (radius < baseRadius2 * 0.5) continue;
          }
          const normalizedPos = (radius - baseRadius2) / (maxRadius2 - baseRadius2 + circleSpacing);
          const opacity = Math.max(0.2, 1 - normalizedPos * 0.7);
          const scaledRadius = Math.max(10, radius * p2.scale);

          ctx.beginPath();
          if (tiltEnabled) {
            // Draw ellipse for 3D effect - ellipse is oriented along the rotation axis
            const minorScale = Math.abs(Math.cos(currentTiltAngle));
            ctx.ellipse(p2.x, p2.y, scaledRadius * minorScale, scaledRadius, axisAngle, 0, Math.PI * 2);
          } else {
            ctx.arc(center2X, center2Y, scaledRadius, 0, Math.PI * 2);
          }
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * p2.scale})`;
          ctx.lineWidth = 2 * p2.scale;
          ctx.stroke();
        }
      }

      // Draw dots with perspective (rotating around dot-dot axis)
      const dot1P = applyPerspective(dot1ScreenX, dot1ScreenY, width / 2, height / 2);
      const dot2P = applyPerspective(dot2ScreenX, dot2ScreenY, width / 2, height / 2);

      ctx.beginPath();
      ctx.arc(tiltEnabled ? dot1P.x : dot1ScreenX, tiltEnabled ? dot1P.y : dot1ScreenY, dotSize * dot1P.scale, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tiltEnabled ? dot2P.x : dot2ScreenX, tiltEnabled ? dot2P.y : dot2ScreenY, dotSize * dot2P.scale, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [
    view,
    orbitRadius,
    bpm,
    circleRadius,
    dotSize,
    numCircles,
    circleSpacing,
    directionPattern,
    circles1VisiblePattern,
    circles2VisiblePattern,
    circles1PositionPattern,
    circles2PositionPattern,
    circlesGrowthPattern,
    tilt3DPattern,
    isChannelActive,
    patternLengths,
    growthRate,
    tiltAmount,
    useArrangement,
    getArrangementLength,
    getActivePatternForType,
    getActivePatternLengthForType,
    controlsPanelWidth,
    drumMachineHeight,
    arrangementHeight,
    isFullscreen,
  ]);

  const handleBooleanMouseDown = (row: string, index: number, pattern: boolean[], setPattern: (p: boolean[]) => void) => {
    const newValue = !pattern[index];
    const newPattern = [...pattern];
    newPattern[index] = newValue;
    setPattern(newPattern);
    setDragState({ row, value: newValue });
  };

  const handleBooleanMouseEnter = (row: string, index: number, pattern: boolean[], setPattern: (p: boolean[]) => void) => {
    if (dragState && dragState.row === row) {
      const newPattern = [...pattern];
      newPattern[index] = dragState.value;
      setPattern(newPattern);
    }
  };

  const handleMouseUp = () => setDragState(null);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Subdivision changes number of cells per beat
  // Total cells = patternLength * subdivision
  const cycleSubdivision = (row: keyof typeof subdivisions, pattern: boolean[], setPattern: (p: boolean[]) => void) => {
    const currentSub = subdivisions[row];
    const baseLen = patternLengths[row];
    const currentIndex = subdivisionOptions.indexOf(currentSub);
    const nextIndex = (currentIndex + 1) % subdivisionOptions.length;
    const newSub = subdivisionOptions[nextIndex];

    // Calculate new total cells and resize pattern
    const newTotalCells = Math.round(baseLen * newSub);
    const currentTotalCells = pattern.length;

    if (newTotalCells !== currentTotalCells) {
      // When increasing subdivision, interleave new empty cells
      // When decreasing, combine cells (keep if any in group was true)
      const newPattern: boolean[] = [];
      for (let i = 0; i < newTotalCells; i++) {
        const oldIndex = Math.floor((i / newTotalCells) * currentTotalCells);
        newPattern.push(pattern[oldIndex] ?? false);
      }
      setPattern(newPattern);
    }

    setSubdivisions({ ...subdivisions, [row]: newSub });
  };

  // Pattern length changes base number of beats
  const cyclePatternLength = (row: keyof typeof patternLengths, pattern: boolean[], setPattern: (p: boolean[]) => void) => {
    const current = patternLengths[row];
    const currentSub = subdivisions[row];
    const currentIndex = patternLengthOptions.indexOf(current);
    const nextIndex = (currentIndex + 1) % patternLengthOptions.length;
    const newBaseLength = patternLengthOptions[nextIndex];

    // Calculate new total cells
    const newTotalCells = Math.round(newBaseLength * currentSub);
    setPattern(resizePattern(pattern, newTotalCells));
    setPatternLengths({ ...patternLengths, [row]: newBaseLength });
  };

  const formatSubdivision = (value: number) => {
    if (value === 0.25) return "¼×";
    if (value === 0.5) return "½×";
    if (value === 1) return "1×";
    if (value === 2) return "2×";
    if (value === 4) return "4×";
    return `${value}×`;
  };

  const formatPatternLength = (value: number) => `${value}`;

  // Toggle fullscreen
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // Audio file handling
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Revoke previous URL if exists
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setAudioFileName(file.name);
      setIsPlaying(false);

      // Store blob for later saving to IndexedDB
      audioBlobRef.current = file;

      // If we have a rhythm ID, save immediately
      if (currentRhythmId) {
        try {
          await saveAudioToDB(currentRhythmId, file, file.name);
        } catch (err) {
          console.error("Failed to save audio to IndexedDB:", err);
        }
      }
    }
  };

  // Play/Pause with sync
  const togglePlayPause = () => {
    if (isPlaying) {
      // Pause
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      // Play - sync audio and animation
      if (audioRef.current && audioUrl) {
        audioRef.current.currentTime = syncOffset;
        audioRef.current.play();
      }
      // Reset animation time to match sync offset
      timeRef.current = 0;
      setIsPlaying(true);
    }
  };

  // Stop and reset
  const stopPlayback = () => {
    setIsPlaying(false);
    timeRef.current = 0;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = syncOffset;
    }
  };

  // Set current audio position as sync point
  const setSyncFromCurrentPosition = () => {
    if (audioRef.current) {
      setSyncOffset(audioRef.current.currentTime);
    }
  };

  // Home screen
  if (view === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Orbital Circles</h1>
          <p className="text-gray-400 mb-8">Create hypnotic orbital visualizations with programmable rhythms</p>

          <button
            onClick={createNewRhythm}
            className="mb-8 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold transition-colors"
          >
            + Create New Rhythm
          </button>

          {savedRhythms.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Your Rhythms</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedRhythms.map(rhythm => (
                  <div
                    key={rhythm.id}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-cyan-500 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{rhythm.name}</h3>
                        <p className="text-sm text-gray-400">{rhythm.bpm} BPM</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadRhythm(rhythm)}
                          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-sm"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => deleteRhythm(rhythm.id)}
                          className="px-3 py-1 bg-red-600/50 hover:bg-red-500 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-4">Preset Beats</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {defaultBeats.map((beat, i) => (
                <button
                  key={i}
                  onClick={() => loadDefaultBeat(beat)}
                  className="bg-gradient-to-br from-purple-900/50 to-cyan-900/50 border border-purple-500/30 rounded-lg p-4 text-left hover:border-purple-400 transition-colors"
                >
                  <h3 className="font-semibold">{beat.name}</h3>
                  <p className="text-sm text-gray-400">{beat.bpm} BPM</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Editor view - Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 group cursor-none hover:cursor-auto">
        <canvas ref={canvasRef} className="w-full h-full" />
        {/* Hidden audio element for fullscreen */}
        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} onEnded={stopPlayback} />
        )}
        {/* Hover-visible controls */}
        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={togglePlayPause}
              className={`px-6 py-3 rounded-lg text-lg font-medium transition-colors ${
                isPlaying
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-green-600 hover:bg-green-500"
              }`}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button
              onClick={stopPlayback}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-lg"
            >
              ⏹
            </button>
          </div>
        </div>
        {/* Exit button - always visible in top right on hover */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 px-4 py-2 bg-black/80 hover:bg-black rounded-lg text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          Exit Fullscreen
        </button>
        {/* BPM and bar info */}
        <div className="absolute top-4 left-4 text-white/50 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div>{bpm} BPM</div>
          <div>Bar: {(arrangementBarRef.current + 1).toFixed(1)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden select-none">
      {/* Hidden audio element */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} onEnded={stopPlayback} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/50 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView("home")}
            className="text-gray-400 hover:text-white"
          >
            ← Back
          </button>
          <input
            type="text"
            value={rhythmName}
            onChange={(e) => setRhythmName(e.target.value)}
            className="bg-transparent border-b border-gray-600 focus:border-cyan-500 outline-none px-2 py-1 text-lg font-semibold"
          />
          <span className="text-gray-500 text-sm">{bpm} BPM</span>
        </div>

        {/* Audio Player Controls */}
        <div className="flex items-center gap-3">
          <label className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm cursor-pointer">
            {audioFileName || "Load Audio"}
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
            />
          </label>
          {audioUrl && (
            <>
              <button
                onClick={togglePlayPause}
                className={`px-4 py-1.5 rounded text-sm font-medium ${
                  isPlaying
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-green-600 hover:bg-green-500"
                }`}
              >
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <button
                onClick={stopPlayback}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                ⏹
              </button>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-gray-400">Sync:</span>
                <input
                  type="number"
                  value={syncOffset.toFixed(2)}
                  onChange={(e) => setSyncOffset(Number(e.target.value))}
                  className="w-16 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-xs"
                  step="0.1"
                  min="0"
                />
                <span className="text-gray-500">s</span>
                <button
                  onClick={setSyncFromCurrentPosition}
                  className="px-2 py-0.5 bg-purple-700 hover:bg-purple-600 rounded text-xs"
                  title="Set sync point from current audio position"
                >
                  Set
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={saveCurrentRhythm}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-sm font-medium"
          >
            Save
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Fullscreen
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Controls sidebar */}
        <div
          className="bg-black/30 border-r border-gray-800 overflow-y-auto p-4 space-y-4 relative flex-shrink-0"
          style={{ width: controlsPanelWidth }}
        >
          {/* Resize handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-cyan-500/50 transition-colors"
            onMouseDown={(e) => handleResizeStart("controls", e)}
          />
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Controls</h2>
            <button
              onClick={() => setControlsVisible(!controlsVisible)}
              className="text-gray-400 hover:text-white text-sm"
            >
              {controlsVisible ? "Hide" : "Show"}
            </button>
          </div>

          {controlsVisible && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="flex justify-between text-sm">
                  <span>Orbit Radius</span>
                  <span className="text-gray-400">{orbitRadius}px</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="400"
                  value={orbitRadius}
                  onChange={(e) => setOrbitRadius(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="flex justify-between text-sm">
                  <span>Tempo</span>
                  <span className="text-gray-400">{bpm} BPM</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="flex justify-between text-sm">
                  <span>Circle Radius</span>
                  <span className="text-gray-400">{circleRadius}px</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="400"
                  value={circleRadius}
                  onChange={(e) => setCircleRadius(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="flex justify-between text-sm">
                  <span>Num Circles</span>
                  <span className="text-gray-400">{numCircles}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={numCircles}
                  onChange={(e) => setNumCircles(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="flex justify-between text-sm">
                  <span>Circle Spacing</span>
                  <span className="text-gray-400">{circleSpacing}px</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={circleSpacing}
                  onChange={(e) => setCircleSpacing(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="flex justify-between text-sm">
                  <span>Dot Size</span>
                  <span className="text-gray-400">{dotSize}px</span>
                </label>
                <input
                  type="range"
                  min="4"
                  max="40"
                  value={dotSize}
                  onChange={(e) => setDotSize(Number(e.target.value))}
                  className="w-full accent-white"
                />
              </div>

              <div className="space-y-1">
                <label className="flex justify-between text-sm">
                  <span>Growth Rate</span>
                  <span className="text-gray-400">{growthRate.toFixed(1)}×</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="4"
                  step="0.1"
                  value={growthRate}
                  onChange={(e) => setGrowthRate(Number(e.target.value))}
                  className="w-full accent-green-500"
                />
              </div>

              <div className="space-y-1">
                <label className="flex justify-between text-sm">
                  <span>3D Tilt</span>
                  <span className="text-gray-400">{tiltAmount}°</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={tiltAmount}
                  onChange={(e) => setTiltAmount(Number(e.target.value))}
                  className="w-full accent-pink-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Canvas area */}
        <div className="flex-1 relative bg-black">
          <canvas ref={canvasRef} className="absolute inset-0" />
        </div>
      </div>

      {/* Drum machine */}
      <div className="bg-black/90 border-t border-gray-800 relative flex-shrink-0">
        {/* Resize handle */}
        {drumMachineExpanded && (
          <div
            className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-cyan-500/50 transition-colors z-10"
            onMouseDown={(e) => handleResizeStart("drumMachine", e)}
          />
        )}
        <div
          className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-white/5"
          onClick={() => setDrumMachineExpanded(!drumMachineExpanded)}
        >
          <h2 className="text-sm font-semibold">Pattern Sequencer</h2>
          <span className="text-gray-400">{drumMachineExpanded ? "▼" : "▲"}</span>
        </div>

        {drumMachineExpanded && (
          <div
            className="px-4 pb-4 overflow-x-auto overflow-y-auto"
            style={{ maxHeight: drumMachineHeight }}
          >
            {/* Pattern selector tabs */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
              <span className="text-xs text-gray-500 mr-2">Patterns:</span>
              <div className="flex gap-1 flex-wrap">
                {patterns.map((pattern) => (
                  <button
                    key={pattern.id}
                    onClick={() => switchToPattern(pattern.id)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      pattern.id === currentPatternId
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    }`}
                  >
                    {pattern.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={addNewPattern}
                  className="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 rounded"
                  title="Add new pattern"
                >
                  +
                </button>
                <button
                  onClick={duplicatePattern}
                  className="px-2 py-1 text-xs bg-purple-700 hover:bg-purple-600 rounded"
                  title="Duplicate current pattern"
                >
                  ⧉
                </button>
                {patterns.length > 1 && (
                  <button
                    onClick={() => deletePattern(currentPatternId)}
                    className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 rounded"
                    title="Delete current pattern"
                  >
                    ×
                  </button>
                )}
              </div>
              <input
                type="text"
                value={patterns.find(p => p.id === currentPatternId)?.name || ""}
                onChange={(e) => renamePattern(currentPatternId, e.target.value)}
                className="ml-3 px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded w-32"
                placeholder="Pattern name"
              />
            </div>

            <div className="space-y-2 min-w-max">
              {/* Dynamic rows */}
              {visibleRows.map((row, index) => {
                const info = ROW_TYPE_INFO[row.type];
                const { pattern, setPattern } = getPatternForType(row.type);
                return (
                  <div key={row.id} className="flex items-center gap-1">
                    {/* Row management buttons */}
                    <div className="flex flex-col gap-0.5 mr-1">
                      <button
                        onClick={() => moveRowUp(row.id)}
                        className="text-[10px] text-gray-500 hover:text-white px-1 leading-none"
                        title="Move up"
                        disabled={index === 0}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveRowDown(row.id)}
                        className="text-[10px] text-gray-500 hover:text-white px-1 leading-none"
                        title="Move down"
                        disabled={index === visibleRows.length - 1}
                      >
                        ▼
                      </button>
                    </div>
                    <PatternRow
                      label={info.label}
                      channel={row.type}
                      pattern={pattern}
                      setPattern={setPattern}
                      subdivision={subdivisions[row.type]}
                      patternLength={patternLengths[row.type]}
                      onCycleSubdivision={() => cycleSubdivision(row.type, pattern, setPattern)}
                      onCyclePatternLength={() => cyclePatternLength(row.type, pattern, setPattern)}
                      formatSubdivision={formatSubdivision}
                      channelStates={channelStates}
                      toggleMute={toggleMute}
                      toggleSolo={toggleSolo}
                      isChannelActive={isChannelActive}
                      handleMouseDown={handleBooleanMouseDown}
                      handleMouseEnter={handleBooleanMouseEnter}
                      hitSymbol={info.hitSymbol}
                      hitColor={info.hitColor}
                      cellWidth={cellWidth}
                    />
                    <button
                      onClick={() => removeRow(row.id)}
                      className="text-gray-500 hover:text-red-400 text-xs px-1 ml-1"
                      title="Remove row"
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              {/* Add row button */}
              <div className="relative inline-block">
                <button
                  onClick={() => setShowAddRowMenu(!showAddRowMenu)}
                  className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-1"
                >
                  + Add Row
                </button>
                {showAddRowMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-10 min-w-[200px]">
                    {(Object.keys(ROW_TYPE_INFO) as RowType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => addRow(type)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-700 flex items-center gap-2"
                      >
                        <span className={ROW_TYPE_INFO[type].hitColor.split(" ")[0].replace("bg-", "text-")}>
                          {ROW_TYPE_INFO[type].hitSymbol}
                        </span>
                        <span>{ROW_TYPE_INFO[type].label}</span>
                        <span className="text-gray-500 ml-auto">{ROW_TYPE_INFO[type].description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span>Cell Size:</span>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={cellWidth}
                  onChange={(e) => setCellWidth(Number(e.target.value))}
                  className="w-20 accent-gray-500"
                />
                <span className="text-gray-400">{cellWidth}px</span>
              </div>
              <span><span className="text-red-500">M</span>=Mute <span className="text-yellow-500">S</span>=Solo</span>
              <span><span className="text-purple-400">¼×-4×</span>=Subdiv</span>
              <span><span className="text-gray-400">4-64</span>=Length</span>
            </div>
          </div>
        )}
      </div>

      {/* Arrangement view */}
      <div className="bg-black/80 border-t border-gray-800 relative flex-shrink-0">
        {/* Resize handle */}
        {arrangementExpanded && (
          <div
            className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-cyan-500/50 transition-colors z-10"
            onMouseDown={(e) => handleResizeStart("arrangement", e)}
          />
        )}
        <div
          className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-white/5"
          onClick={() => setArrangementExpanded(!arrangementExpanded)}
        >
          <h2 className="text-sm font-semibold">Arrangement</h2>
          <span className="text-gray-400">{arrangementExpanded ? "▼" : "▲"}</span>
        </div>

        {arrangementExpanded && (
          <div
            className="px-4 pb-4 overflow-x-auto overflow-y-auto"
            style={{ maxHeight: arrangementHeight }}
          >
            {/* Pattern library for dragging */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500">Add to timeline:</span>
              <div className="flex gap-1 flex-wrap">
                {patterns.map((pattern) => (
                  <button
                    key={pattern.id}
                    onClick={() => addClipToArrangement(pattern.id)}
                    className="px-3 py-1 text-xs bg-cyan-700 hover:bg-cyan-600 rounded"
                    title={`Add ${pattern.name} to arrangement`}
                  >
                    + {pattern.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-gray-900 rounded-lg p-3 min-h-[80px]">
              {arrangement.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-4">
                  Click a pattern above to add it to the timeline
                </div>
              ) : (
                <div className="relative">
                  {/* Bar markers */}
                  <div className="flex border-b border-gray-700 pb-1 mb-2">
                    {Array.from({ length: Math.max(16, arrangement.reduce((max, c) => Math.max(max, c.startBar + c.length), 0) + 4) }, (_, i) => (
                      <div
                        key={i}
                        className="w-8 text-center text-[10px] text-gray-600 flex-shrink-0"
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Clips - entire area is droppable */}
                  <div
                    className="relative h-12"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const clipId = e.dataTransfer.getData("clipId");
                      if (!clipId) return;

                      const grabOffset = parseInt(e.dataTransfer.getData("grabOffset") || "0", 10);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const dropX = e.clientX - rect.left;
                      const newBar = Math.max(0, Math.round((dropX - grabOffset) / 32));
                      moveClip(clipId, newBar);
                    }}
                  >
                    {arrangement.map((clip) => {
                      const pattern = patterns.find(p => p.id === clip.patternId);
                      // Generate a color based on pattern index
                      const patternIndex = patterns.findIndex(p => p.id === clip.patternId);
                      const colors = ["bg-cyan-600", "bg-purple-600", "bg-green-600", "bg-orange-600", "bg-pink-600", "bg-blue-600"];
                      const bgColor = colors[patternIndex % colors.length];

                      return (
                        <div
                          key={clip.id}
                          className={`absolute top-0 h-10 ${bgColor} rounded flex items-center justify-between px-2 cursor-grab active:cursor-grabbing group select-none`}
                          style={{
                            left: `${clip.startBar * 32}px`,
                            width: `${clip.length * 32 - 4}px`,
                          }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("clipId", clip.id);
                            // Store the offset within the clip where we grabbed it
                            const rect = e.currentTarget.getBoundingClientRect();
                            const grabOffset = e.clientX - rect.left;
                            e.dataTransfer.setData("grabOffset", String(grabOffset));
                            e.dataTransfer.effectAllowed = "move";
                          }}
                        >
                          <span className="text-xs font-medium truncate pointer-events-none">{pattern?.name || "?"}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeClipFromArrangement(clip.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-white/70 hover:text-white text-xs ml-1"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}

                    {/* Playhead */}
                    <div
                      ref={playheadRef}
                      className="absolute top-0 h-full w-0.5 bg-red-500 z-20 pointer-events-none"
                      style={{ left: "0px" }}
                    >
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-red-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span>Drag clips to rearrange. Click × to remove.</span>
                <span className="text-cyan-400">Bar: <span ref={barDisplayRef}>0.0</span></span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useArrangement}
                  onChange={(e) => setUseArrangement(e.target.checked)}
                  className="accent-cyan-500"
                />
                <span>Use Arrangement</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Pattern row component
function PatternRow({
  label,
  channel,
  pattern,
  setPattern,
  subdivision,
  patternLength,
  onCycleSubdivision,
  onCyclePatternLength,
  formatSubdivision,
  channelStates,
  toggleMute,
  toggleSolo,
  isChannelActive,
  handleMouseDown,
  handleMouseEnter,
  hitSymbol,
  hitColor,
  cellWidth,
}: {
  label: string;
  channel: string;
  pattern: boolean[];
  setPattern: (p: boolean[]) => void;
  subdivision: number;
  patternLength: number;
  onCycleSubdivision: () => void;
  onCyclePatternLength: () => void;
  formatSubdivision: (v: number) => string;
  channelStates: Record<string, ChannelState>;
  toggleMute: (c: string) => void;
  toggleSolo: (c: string) => void;
  isChannelActive: (c: string) => boolean;
  handleMouseDown: (row: string, index: number, pattern: boolean[], setPattern: (p: boolean[]) => void) => void;
  handleMouseEnter: (row: string, index: number, pattern: boolean[], setPattern: (p: boolean[]) => void) => void;
  hitSymbol: string;
  hitColor: string;
  cellWidth: number;
}) {
  const active = isChannelActive(channel);
  const state = channelStates[channel];

  // Each cell is individually controllable
  // Cell width shrinks as we have more cells, but keep consistent total width
  const totalCells = pattern.length;
  const baseRowWidth = 16 * cellWidth; // Width for 16 cells at base size
  const actualCellWidth = Math.max(baseRowWidth / totalCells, 8);
  const gapSize = actualCellWidth > 20 ? 2 : 1;

  return (
    <div className="flex items-center" style={{ gap: gapSize }}>
      <div className="w-24 text-xs text-right pr-2 flex items-center justify-end gap-1 shrink-0">
        <button
          onClick={() => toggleMute(channel)}
          className={`w-5 h-5 rounded text-[10px] font-bold ${
            state?.mute ? "bg-red-700" : "bg-gray-600 hover:bg-gray-500"
          }`}
          title="Mute"
        >
          M
        </button>
        <button
          onClick={() => toggleSolo(channel)}
          className={`w-5 h-5 rounded text-[10px] font-bold ${
            state?.solo ? "bg-yellow-500 text-black" : "bg-gray-600 hover:bg-gray-500"
          }`}
          title="Solo"
        >
          S
        </button>
        <span className={!active ? "opacity-50" : ""}>{label}</span>
      </div>
      <button
        onClick={onCycleSubdivision}
        className="w-8 h-7 rounded text-xs bg-purple-700 hover:bg-purple-600 shrink-0"
        title="Subdivision (cells per beat)"
      >
        {formatSubdivision(subdivision)}
      </button>
      <button
        onClick={onCyclePatternLength}
        className="w-8 h-7 rounded text-xs bg-gray-700 hover:bg-gray-600 shrink-0"
        title="Base pattern length (beats)"
      >
        {patternLength}
      </button>
      <div className="flex" style={{ gap: gapSize }}>
        {pattern.map((val, i) => {
          // Highlight downbeats (first cell of each beat group)
          const isDownbeat = subdivision > 1 && i % subdivision === 0;
          return (
            <button
              key={i}
              onMouseDown={() => handleMouseDown(channel, i, pattern, setPattern)}
              onMouseEnter={() => handleMouseEnter(channel, i, pattern, setPattern)}
              style={{
                width: actualCellWidth,
                minWidth: actualCellWidth,
                height: 28,
                fontSize: actualCellWidth < 20 ? '8px' : '12px',
              }}
              className={`rounded font-bold transition-colors ${
                val ? hitColor : "bg-gray-700 hover:bg-gray-600"
              } ${!active ? "opacity-50" : ""} ${isDownbeat ? "border-l-2 border-white/30" : ""}`}
            >
              {actualCellWidth >= 14 ? (val ? hitSymbol : "·") : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

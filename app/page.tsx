"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Types
import type { RhythmData, PatternData, RowType, SynthSettings } from "@/types";

// Constants
import {
  createDefaultPattern,
  DEFAULT_CHANNEL_STATES,
  DEFAULT_VISUALIZATION,
  ANIMATION,
} from "@/constants";

// Utils
import {
  generateId,
  clearCanvas,
  renderInstrument,
  calculateRotationEffect,
  calculateFlipYEffect,
  type RenderContext,
  type InstrumentPatternState,
} from "@/utils";

// Services
import {
  loadRhythms,
  saveRhythms,
  saveAudioToDB,
  loadAudioFromDB,
  deleteAudioFromDB,
  migrateRhythmData,
} from "@/services/storage";

// Hooks
import {
  usePatternState,
  useVisualizationSettings,
  usePanelLayout,
  useChannelState,
  useDragState,
  useArrangement,
  useRowManagement,
  useMIDIPatternBridge,
  useSynthSettings,
} from "@/hooks";

// Components
import {
  Header,
  HomeScreen,
  ControlsPanel,
  DrumMachine,
  ArrangementTimeline,
  MIDIEditor,
  SynthSettingsPanel,
} from "@/components";

export default function Home() {
  // Refs
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

  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncOffset, setSyncOffset] = useState(0);

  // Loop state
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(4);

  // Sequencer view mode (drum machine vs MIDI editor)
  const [sequencerMode, setSequencerMode] = useState<"drum" | "midi">("drum");

  // Synth settings panel visibility
  const [synthSettingsVisible, setSynthSettingsVisible] = useState(true);

  // Custom hooks
  const patternState = usePatternState();
  const visualSettings = useVisualizationSettings();
  const panelLayout = usePanelLayout();
  const channelState = useChannelState();
  const dragState = useDragState();
  const arrangement = useArrangement();
  const rowManagement = useRowManagement();
  const synthSettings = useSynthSettings();

  // MIDI pattern bridge for converting between boolean patterns and MIDI notes
  const midiPatternBridge = useMIDIPatternBridge({
    getPatternForType: patternState.getPatternForType,
    getEffectPatternForType: patternState.getEffectPatternForType,
    patternLengths: patternState.patternLengths,
    effectPatternLengths: patternState.effectPatternLengths,
    subdivisions: patternState.subdivisions,
    effectSubdivisions: patternState.effectSubdivisions,
    bars: arrangement.patterns.find((p) => p.id === arrangement.currentPatternId)?.bars || 4,
  });

  // Animation state ref - stores all values needed for rendering
  // Mutate properties directly to avoid object creation overhead
  const animationStateRef = useRef<{
    bpm: number;
    orbitRadius: number;
    circleRadius: number;
    dotSize: number;
    numCircles: number;
    circleSpacing: number;
    growthRate: number;
    tiltAmount: number;
    instrument: string;
    directionPattern: boolean[];
    circles1VisiblePattern: boolean[];
    circles2VisiblePattern: boolean[];
    circles1PositionPattern: boolean[];
    circles2PositionPattern: boolean[];
    circlesGrowthPattern: boolean[];
    tilt3DPattern: boolean[];
    rotationEnabledPattern: boolean[];
    rotationDirectionPattern: boolean[];
    flipYPattern: boolean[];
    patternLengths: Record<RowType, number>;
    effectPatternLengths: { rotationEnabled: number; rotationDirection: number; flipY: number };
    isChannelActive: (channel: string) => boolean;
    useArrangement: boolean;
    currentPatternId: string;
    patterns: PatternData[];
    arrangement: { id: string; patternId: string; startBar: number; length: number; stack: number }[];
    getArrangementLength: () => number;
    getActiveClip: (bar: number) => { patternId: string } | null;
    getActivePatternForType: (type: RowType, bar: number, fallback: boolean[]) => boolean[];
    getActivePatternLengthForType: (type: RowType, bar: number, fallback: Record<RowType, number>) => number;
    loopEnabled: boolean;
    loopStart: number;
    loopEnd: number;
    getStackSettings: (stackIndex: number) => import("@/types").StackSettings;
    synthSettings: SynthSettings;
  }>(null!);

  // Mutate ref properties directly on every render (no object allocation)
  const state = animationStateRef.current || (animationStateRef.current = {} as typeof animationStateRef.current);
  state.bpm = visualSettings.bpm;
  state.orbitRadius = visualSettings.orbitRadius;
  state.circleRadius = visualSettings.circleRadius;
  state.dotSize = visualSettings.dotSize;
  state.numCircles = visualSettings.numCircles;
  state.circleSpacing = visualSettings.circleSpacing;
  state.growthRate = visualSettings.growthRate;
  state.tiltAmount = visualSettings.tiltAmount;
  state.instrument = patternState.instrument;
  state.directionPattern = patternState.directionPattern;
  state.circles1VisiblePattern = patternState.circles1VisiblePattern;
  state.circles2VisiblePattern = patternState.circles2VisiblePattern;
  state.circles1PositionPattern = patternState.circles1PositionPattern;
  state.circles2PositionPattern = patternState.circles2PositionPattern;
  state.circlesGrowthPattern = patternState.circlesGrowthPattern;
  state.tilt3DPattern = patternState.tilt3DPattern;
  state.rotationEnabledPattern = patternState.rotationEnabledPattern;
  state.rotationDirectionPattern = patternState.rotationDirectionPattern;
  state.flipYPattern = patternState.flipYPattern;
  state.patternLengths = patternState.patternLengths;
  state.effectPatternLengths = patternState.effectPatternLengths;
  state.isChannelActive = channelState.isChannelActive;
  state.useArrangement = arrangement.useArrangement;
  state.currentPatternId = arrangement.currentPatternId;
  state.patterns = arrangement.patterns;
  state.arrangement = arrangement.arrangement;
  state.getArrangementLength = arrangement.getArrangementLength;
  state.getActiveClip = arrangement.getActiveClip;
  state.getActivePatternForType = arrangement.getActivePatternForType;
  state.getActivePatternLengthForType = arrangement.getActivePatternLengthForType;
  state.loopEnabled = loopEnabled;
  state.loopStart = loopStart;
  state.loopEnd = loopEnd;
  state.getStackSettings = arrangement.getStackSettings;
  state.synthSettings = synthSettings.settings;

  // Load saved rhythms on mount
  useEffect(() => {
    setSavedRhythms(loadRhythms());
  }, []);

  // Helper to get current pattern data from editing state
  const getCurrentPatternData = useCallback((): PatternData => ({
    id: arrangement.currentPatternId,
    name: arrangement.patterns.find((p) => p.id === arrangement.currentPatternId)?.name || "Pattern 1",
    bars: arrangement.patterns.find((p) => p.id === arrangement.currentPatternId)?.bars || 4,
    instrument: patternState.instrument,
    directionPattern: patternState.directionPattern,
    circles1VisiblePattern: patternState.circles1VisiblePattern,
    circles2VisiblePattern: patternState.circles2VisiblePattern,
    circles1PositionPattern: patternState.circles1PositionPattern,
    circles2PositionPattern: patternState.circles2PositionPattern,
    circlesGrowthPattern: patternState.circlesGrowthPattern,
    tilt3DPattern: patternState.tilt3DPattern,
    rotationEnabledPattern: patternState.rotationEnabledPattern,
    rotationDirectionPattern: patternState.rotationDirectionPattern,
    flipYPattern: patternState.flipYPattern,
    subdivisions: patternState.subdivisions,
    effectSubdivisions: patternState.effectSubdivisions,
    patternLengths: patternState.patternLengths,
    effectPatternLengths: patternState.effectPatternLengths,
    visibleRows: rowManagement.visibleRows,
    visualSettings: {
      orbitRadius: visualSettings.orbitRadius,
      circleRadius: visualSettings.circleRadius,
      dotSize: visualSettings.dotSize,
      numCircles: visualSettings.numCircles,
      circleSpacing: visualSettings.circleSpacing,
      growthRate: visualSettings.growthRate,
      tiltAmount: visualSettings.tiltAmount,
    },
    synthSettings: synthSettings.settings,
  }), [
    arrangement.currentPatternId,
    arrangement.patterns,
    patternState.instrument,
    patternState.directionPattern,
    patternState.circles1VisiblePattern,
    patternState.circles2VisiblePattern,
    patternState.circles1PositionPattern,
    patternState.circles2PositionPattern,
    patternState.circlesGrowthPattern,
    patternState.tilt3DPattern,
    patternState.rotationEnabledPattern,
    patternState.rotationDirectionPattern,
    patternState.flipYPattern,
    patternState.subdivisions,
    patternState.effectSubdivisions,
    patternState.patternLengths,
    patternState.effectPatternLengths,
    rowManagement.visibleRows,
    visualSettings.orbitRadius,
    visualSettings.circleRadius,
    visualSettings.dotSize,
    visualSettings.numCircles,
    visualSettings.circleSpacing,
    visualSettings.growthRate,
    visualSettings.tiltAmount,
    synthSettings.settings,
  ]);

  // Helper to build rhythm data for saving
  const buildRhythmData = useCallback((): RhythmData => {
    const currentPattern = getCurrentPatternData();
    const updatedPatterns = arrangement.patterns.map((p) =>
      p.id === arrangement.currentPatternId ? currentPattern : p
    );
    const currentArrangement = arrangement.arrangement.length > 0
      ? arrangement.arrangement
      : [{ id: generateId(), patternId: arrangement.currentPatternId, startBar: 0, length: currentPattern.bars, stack: 0 }];

    return {
      id: currentRhythmId || generateId(),
      name: rhythmName,
      createdAt: Date.now(),
      orbitRadius: visualSettings.orbitRadius,
      bpm: visualSettings.bpm,
      circleRadius: visualSettings.circleRadius,
      dotSize: visualSettings.dotSize,
      numCircles: visualSettings.numCircles,
      circleSpacing: visualSettings.circleSpacing,
      growthRate: visualSettings.growthRate,
      tiltAmount: visualSettings.tiltAmount,
      channelStates: channelState.channelStates,
      patterns: updatedPatterns,
      arrangement: currentArrangement,
      stackSettings: arrangement.stackSettings,
      synthSettings: synthSettings.settings,
    };
  }, [
    getCurrentPatternData,
    arrangement.patterns,
    arrangement.currentPatternId,
    arrangement.arrangement,
    arrangement.stackSettings,
    currentRhythmId,
    rhythmName,
    visualSettings,
    channelState.channelStates,
    synthSettings.settings,
  ]);

  // Autosave every 3 seconds
  useEffect(() => {
    if (view !== "editor") return;
    const autosaveInterval = setInterval(() => {
      if (rhythmName && rhythmName !== "Untitled") {
        const rhythm = buildRhythmData();
        const existing = loadRhythms().filter((r) => r.id !== rhythm.id);
        const updated = [...existing, rhythm];
        saveRhythms(updated);
        if (!currentRhythmId) {
          setCurrentRhythmId(rhythm.id);
        }
      }
    }, 3000);
    return () => clearInterval(autosaveInterval);
  }, [view, rhythmName, currentRhythmId, buildRhythmData]);

  // Sync visual settings to current pattern whenever they change
  useEffect(() => {
    arrangement.updateCurrentPatternVisualSettings({
      orbitRadius: visualSettings.orbitRadius,
      circleRadius: visualSettings.circleRadius,
      dotSize: visualSettings.dotSize,
      numCircles: visualSettings.numCircles,
      circleSpacing: visualSettings.circleSpacing,
      growthRate: visualSettings.growthRate,
      tiltAmount: visualSettings.tiltAmount,
    });
  }, [
    visualSettings.orbitRadius,
    visualSettings.circleRadius,
    visualSettings.dotSize,
    visualSettings.numCircles,
    visualSettings.circleSpacing,
    visualSettings.growthRate,
    visualSettings.tiltAmount,
    arrangement.updateCurrentPatternVisualSettings,
  ]);

  // Sync synth settings to current pattern whenever they change
  useEffect(() => {
    arrangement.updateCurrentPatternSynthSettings(synthSettings.settings);
  }, [synthSettings.settings, arrangement.updateCurrentPatternSynthSettings]);

  // Clear audio state
  const clearAudio = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioFileName("");
    audioBlobRef.current = null;
    setIsPlaying(false);
    setSyncOffset(0);
  }, [audioUrl]);

  // Save current rhythm
  const saveCurrentRhythm = async () => {
    const rhythm = buildRhythmData();
    const existing = savedRhythms.filter((r) => r.id !== rhythm.id);
    const updated = [...existing, rhythm];
    setSavedRhythms(updated);
    saveRhythms(updated);
    setCurrentRhythmId(rhythm.id);

    if (audioBlobRef.current && audioFileName) {
      try {
        await saveAudioToDB(rhythm.id, audioBlobRef.current, audioFileName);
      } catch (err) {
        console.error("Failed to save audio:", err);
      }
    }
  };

  // Load a rhythm
  const loadRhythm = async (rhythm: RhythmData) => {
    const migrated = migrateRhythmData(rhythm);

    setCurrentRhythmId(migrated.id);
    setRhythmName(migrated.name);
    visualSettings.setOrbitRadius(migrated.orbitRadius);
    visualSettings.setBpm(migrated.bpm);
    visualSettings.setCircleRadius(migrated.circleRadius);
    visualSettings.setDotSize(migrated.dotSize);
    visualSettings.setNumCircles(migrated.numCircles);
    visualSettings.setCircleSpacing(migrated.circleSpacing);
    visualSettings.setGrowthRate(migrated.growthRate ?? 1);
    visualSettings.setTiltAmount(migrated.tiltAmount ?? 45);
    channelState.setChannelStates(migrated.channelStates);

    // Load synth settings if available
    if (migrated.synthSettings) {
      synthSettings.setSettings(migrated.synthSettings);
    }

    arrangement.setPatterns(migrated.patterns);
    arrangement.setArrangement(migrated.arrangement);
    if (migrated.stackSettings) {
      arrangement.setStackSettings(migrated.stackSettings);
    }

    if (migrated.patterns.length > 0) {
      arrangement.setCurrentPatternId(migrated.patterns[0].id);
      patternState.loadPatternIntoEditor(migrated.patterns[0]);
      // Load visible rows from pattern
      if (migrated.patterns[0].visibleRows && migrated.patterns[0].visibleRows.length > 0) {
        rowManagement.setVisibleRows(migrated.patterns[0].visibleRows);
      }
      // Load visual settings from pattern (overrides global settings)
      if (migrated.patterns[0].visualSettings) {
        visualSettings.setOrbitRadius(migrated.patterns[0].visualSettings.orbitRadius);
        visualSettings.setCircleRadius(migrated.patterns[0].visualSettings.circleRadius);
        visualSettings.setDotSize(migrated.patterns[0].visualSettings.dotSize);
        visualSettings.setNumCircles(migrated.patterns[0].visualSettings.numCircles);
        visualSettings.setCircleSpacing(migrated.patterns[0].visualSettings.circleSpacing);
        visualSettings.setGrowthRate(migrated.patterns[0].visualSettings.growthRate);
        visualSettings.setTiltAmount(migrated.patterns[0].visualSettings.tiltAmount);
      }
      // Load synth settings from pattern (overrides global settings)
      if (migrated.patterns[0].synthSettings) {
        synthSettings.setSettings(migrated.patterns[0].synthSettings);
      }
    }

    timeRef.current = 0;
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
      console.error("Failed to load audio:", err);
    }

    setView("editor");
  };

  // Load a default beat
  const loadDefaultBeat = (beat: Omit<RhythmData, "id" | "createdAt">) => {
    setCurrentRhythmId(null);
    setRhythmName(beat.name);
    visualSettings.setOrbitRadius(beat.orbitRadius);
    visualSettings.setBpm(beat.bpm);
    visualSettings.setCircleRadius(beat.circleRadius);
    visualSettings.setDotSize(beat.dotSize);
    visualSettings.setNumCircles(beat.numCircles);
    visualSettings.setCircleSpacing(beat.circleSpacing);
    visualSettings.setGrowthRate(beat.growthRate);
    visualSettings.setTiltAmount(beat.tiltAmount);
    channelState.setChannelStates(beat.channelStates);

    arrangement.setPatterns(beat.patterns);
    arrangement.setArrangement(beat.arrangement);

    if (beat.patterns.length > 0) {
      arrangement.setCurrentPatternId(beat.patterns[0].id);
      patternState.loadPatternIntoEditor(beat.patterns[0]);
      // Load visible rows from pattern
      if (beat.patterns[0].visibleRows && beat.patterns[0].visibleRows.length > 0) {
        rowManagement.setVisibleRows(beat.patterns[0].visibleRows);
      }
      // Load visual settings from pattern (overrides global settings)
      if (beat.patterns[0].visualSettings) {
        visualSettings.setOrbitRadius(beat.patterns[0].visualSettings.orbitRadius);
        visualSettings.setCircleRadius(beat.patterns[0].visualSettings.circleRadius);
        visualSettings.setDotSize(beat.patterns[0].visualSettings.dotSize);
        visualSettings.setNumCircles(beat.patterns[0].visualSettings.numCircles);
        visualSettings.setCircleSpacing(beat.patterns[0].visualSettings.circleSpacing);
        visualSettings.setGrowthRate(beat.patterns[0].visualSettings.growthRate);
        visualSettings.setTiltAmount(beat.patterns[0].visualSettings.tiltAmount);
      }
      // Load synth settings from pattern (overrides global settings)
      if (beat.patterns[0].synthSettings) {
        synthSettings.setSettings(beat.patterns[0].synthSettings);
      }
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
    visualSettings.resetToDefaults();
    channelState.resetChannelStates();
    synthSettings.reset();

    arrangement.setPatterns([newPattern]);
    arrangement.setArrangement([
      { id: generateId(), patternId: newPattern.id, startBar: 0, length: 4, stack: 0 },
    ]);
    arrangement.setCurrentPatternId(newPattern.id);
    patternState.loadPatternIntoEditor(newPattern);
    // Load visible rows from new pattern
    if (newPattern.visibleRows) {
      rowManagement.setVisibleRows(newPattern.visibleRows);
    }
    // Load visual settings from new pattern
    if (newPattern.visualSettings) {
      visualSettings.setOrbitRadius(newPattern.visualSettings.orbitRadius);
      visualSettings.setCircleRadius(newPattern.visualSettings.circleRadius);
      visualSettings.setDotSize(newPattern.visualSettings.dotSize);
      visualSettings.setNumCircles(newPattern.visualSettings.numCircles);
      visualSettings.setCircleSpacing(newPattern.visualSettings.circleSpacing);
      visualSettings.setGrowthRate(newPattern.visualSettings.growthRate);
      visualSettings.setTiltAmount(newPattern.visualSettings.tiltAmount);
    }
    // Load synth settings from new pattern
    if (newPattern.synthSettings) {
      synthSettings.setSettings(newPattern.synthSettings);
    }

    clearAudio();
    timeRef.current = 0;
    setView("editor");
  };

  // Delete a rhythm
  const deleteRhythm = async (id: string) => {
    const updated = savedRhythms.filter((r) => r.id !== id);
    setSavedRhythms(updated);
    saveRhythms(updated);
    try {
      await deleteAudioFromDB(id);
    } catch (err) {
      console.error("Failed to delete audio:", err);
    }
  };

  // Audio handling
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setAudioFileName(file.name);
      setIsPlaying(false);
      audioBlobRef.current = file;

      if (currentRhythmId) {
        try {
          await saveAudioToDB(currentRhythmId, file, file.name);
        } catch (err) {
          console.error("Failed to save audio:", err);
        }
      }
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      audioRef.current?.pause();
    } else {
      if (audioRef.current && audioUrl) {
        // Calculate current bar and sync audio to match
        const bpm = visualSettings.bpm;
        const beatsElapsed = timeRef.current * (bpm / 60);
        const currentBar = beatsElapsed / 4;
        const secondsPerBar = (60 / bpm) * 4;
        audioRef.current.currentTime = syncOffset + currentBar * secondsPerBar;
        audioRef.current.play();
      }
      // Don't reset timeRef - resume from current position
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    // Reset to loop start if looping, otherwise reset to 0
    const resetBar = loopEnabled ? loopStart : 0;
    const bpm = visualSettings.bpm;
    const secondsPerBar = (60 / bpm) * 4;
    timeRef.current = resetBar * secondsPerBar;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = syncOffset + resetBar * secondsPerBar;
    }
  };

  const setSyncFromCurrentPosition = () => {
    if (audioRef.current) {
      setSyncOffset(audioRef.current.currentTime);
    }
  };

  // Seek to a specific bar position
  const seekToBar = useCallback((bar: number) => {
    const bpm = visualSettings.bpm;
    const beatsPerBar = 4;
    const secondsPerBeat = 60 / bpm;
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    timeRef.current = bar * secondsPerBar;

    // Sync audio if available
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = syncOffset + bar * secondsPerBar;
    }
  }, [visualSettings.bpm, audioUrl, syncOffset]);

  // Pattern switching - loads pattern data, visible rows, and visual settings
  const handleSwitchToPattern = (patternId: string) => {
    const loadPatternFull = (pattern: PatternData) => {
      patternState.loadPatternIntoEditor(pattern);
      // Load visible rows from pattern
      if (pattern.visibleRows && pattern.visibleRows.length > 0) {
        rowManagement.setVisibleRows(pattern.visibleRows);
      }
      // Load visual settings from pattern
      if (pattern.visualSettings) {
        visualSettings.setOrbitRadius(pattern.visualSettings.orbitRadius);
        visualSettings.setCircleRadius(pattern.visualSettings.circleRadius);
        visualSettings.setDotSize(pattern.visualSettings.dotSize);
        visualSettings.setNumCircles(pattern.visualSettings.numCircles);
        visualSettings.setCircleSpacing(pattern.visualSettings.circleSpacing);
        visualSettings.setGrowthRate(pattern.visualSettings.growthRate);
        visualSettings.setTiltAmount(pattern.visualSettings.tiltAmount);
      }
      // Load synth settings from pattern
      if (pattern.synthSettings) {
        synthSettings.setSettings(pattern.synthSettings);
      }
    };
    arrangement.switchToPattern(patternId, getCurrentPatternData, loadPatternFull);
  };

  // Animation effect - reads from refs to avoid restarts on state changes
  useEffect(() => {
    if (view !== "editor") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use alpha: false for better performance since we always draw opaque background
    const ctx = canvas.getContext("2d", { alpha: false });
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

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      timeRef.current += deltaTime;

      const width = canvas.width;
      const height = canvas.height;

      // Read all values from single ref for performance
      const state = animationStateRef.current;

      // Get background color from current pattern's synth settings (or fall back to global)
      const currentPatternForBg = state.patterns?.find((p) => p.id === state.currentPatternId);
      const bgColor = currentPatternForBg?.synthSettings?.colorScheme?.background
        ?? state.synthSettings?.colorScheme?.background;
      clearCanvas(ctx, width, height, bgColor);
      const {
        bpm, orbitRadius, circleRadius, dotSize, numCircles, circleSpacing, growthRate, tiltAmount,
        instrument, directionPattern, circles1VisiblePattern, circles2VisiblePattern,
        circles1PositionPattern, circles2PositionPattern, circlesGrowthPattern, tilt3DPattern,
        rotationEnabledPattern, rotationDirectionPattern, flipYPattern,
        patternLengths, effectPatternLengths, isChannelActive, useArrangement, currentPatternId,
        patterns, arrangement,
        getArrangementLength, getStackSettings,
        loopEnabled, loopStart, loopEnd,
        synthSettings,
      } = state;

      // Calculate current bar position
      const beatsElapsed = timeRef.current * (bpm / 60);
      let currentBar = beatsElapsed / 4;
      const arrangementLen = getArrangementLength();

      // Handle looping
      if (loopEnabled && loopEnd > loopStart) {
        const loopLength = loopEnd - loopStart;
        if (currentBar >= loopEnd) {
          // Jump back to loop start
          const overshoot = currentBar - loopEnd;
          const loopPosition = loopStart + (overshoot % loopLength);
          const secondsPerBar = (60 / bpm) * 4;
          timeRef.current = loopPosition * secondsPerBar;
          currentBar = loopPosition;
        }
      }

      let effectiveBar = currentBar;
      if (useArrangement && arrangementLen > 0 && !loopEnabled) {
        effectiveBar = currentBar % arrangementLen;
      }

      const baseAngle = timeRef.current * (bpm / 60) * Math.PI;
      const halfRotation = ANIMATION.HALF_ROTATION;
      const totalHalfRotations = baseAngle / halfRotation;

      // Update playhead
      arrangementBarRef.current = effectiveBar;
      if (playheadRef.current) {
        playheadRef.current.style.left = `${64 + effectiveBar * 32}px`;
      }
      if (barDisplayRef.current) {
        barDisplayRef.current.textContent = effectiveBar.toFixed(1);
      }

      // If arrangement mode is off or no clips, use the current editor pattern
      if (!useArrangement || arrangement.length === 0) {
        // Create pattern state from current editor
        const editorPatternData: PatternData = {
          id: currentPatternId,
          name: "Editor",
          bars: 4,
          instrument: instrument as "orbital" | "concentric",
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
          subdivisions: patternLengths as unknown as Record<RowType, number>,
          effectSubdivisions: effectPatternLengths as unknown as { rotationEnabled: number; rotationDirection: number; flipY: number },
          patternLengths,
          effectPatternLengths,
        };

        // Calculate rotation effect
        const rotationEffect = calculateRotationEffect(
          rotationEnabledPattern,
          rotationDirectionPattern,
          totalHalfRotations,
          effectPatternLengths?.rotationEnabled || 16,
          isChannelActive("rotationEnabled")
        );

        // Calculate flipY effect
        const flipY = calculateFlipYEffect(
          flipYPattern,
          totalHalfRotations,
          effectPatternLengths?.flipY || 16,
          isChannelActive("flipY")
        );

        // Get current pattern's synth settings (or fall back to global)
        const currentPattern = patterns.find((p) => p.id === currentPatternId);
        const currentSynthSettings = currentPattern?.synthSettings ?? synthSettings;

        // Create render context
        const renderCtx: RenderContext = {
          ctx,
          width,
          height,
          timeRef: timeRef.current,
          bpm,
          orbitRadius,
          circleRadius,
          dotSize,
          numCircles,
          circleSpacing,
          growthRate,
          tiltAmount,
          isChannelActive,
          rotationAngle: rotationEffect.angle,
          flipY,
          stackIndex: 0,
          totalStacks: 1,
          stackSettings: getStackSettings(0),
          synthSettings: currentSynthSettings,
        };

        // Render the current instrument
        renderInstrument(
          (instrument as "orbital" | "concentric") || "orbital",
          renderCtx,
          { pattern: editorPatternData, patternLengths },
          totalHalfRotations
        );
      } else {
        // Arrangement mode: render all active clips across all stacks
        // Group clips by stack
        const stackGroups = new Map<number, typeof arrangement>();
        for (const clip of arrangement) {
          if (effectiveBar >= clip.startBar && effectiveBar < clip.startBar + clip.length) {
            const stack = clip.stack ?? 0;
            if (!stackGroups.has(stack)) {
              stackGroups.set(stack, []);
            }
            stackGroups.get(stack)!.push(clip);
          }
        }

        // Render each stack
        const activeStacks = Array.from(stackGroups.keys()).sort((a, b) => a - b);
        const totalActiveStacks = activeStacks.length;

        for (const [stackIdx, stackKey] of activeStacks.entries()) {
          const clips = stackGroups.get(stackKey)!;
          for (const clip of clips) {
            const pattern = patterns.find((p) => p.id === clip.patternId);
            if (!pattern) continue;

            // Use live editor state if this is the pattern being edited
            const patternToRender = clip.patternId === currentPatternId
              ? {
                  ...pattern,
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
                  patternLengths,
                  effectPatternLengths,
                }
              : pattern;

            // Calculate rotation effect for this pattern
            const rotationEffect = calculateRotationEffect(
              patternToRender.rotationEnabledPattern || Array(16).fill(false),
              patternToRender.rotationDirectionPattern || Array(16).fill(false),
              totalHalfRotations,
              patternToRender.effectPatternLengths?.rotationEnabled || 16,
              isChannelActive("rotationEnabled")
            );

            // Calculate flipY effect for this pattern
            const flipY = calculateFlipYEffect(
              patternToRender.flipYPattern || Array(16).fill(false),
              totalHalfRotations,
              patternToRender.effectPatternLengths?.flipY || 16,
              isChannelActive("flipY")
            );

            // Get visual settings from pattern (or fall back to global)
            const patternVisual = patternToRender.visualSettings;
            const renderOrbitRadius = patternVisual?.orbitRadius ?? orbitRadius;
            const renderCircleRadius = patternVisual?.circleRadius ?? circleRadius;
            const renderDotSize = patternVisual?.dotSize ?? dotSize;
            const renderNumCircles = patternVisual?.numCircles ?? numCircles;
            const renderCircleSpacing = patternVisual?.circleSpacing ?? circleSpacing;
            const renderGrowthRate = patternVisual?.growthRate ?? growthRate;
            const renderTiltAmount = patternVisual?.tiltAmount ?? tiltAmount;

            // Get synth settings from pattern (or fall back to global)
            const patternSynthSettings = patternToRender.synthSettings ?? synthSettings;

            // Create render context with stack positioning
            const renderCtx: RenderContext = {
              ctx,
              width,
              height,
              timeRef: timeRef.current,
              bpm,
              orbitRadius: renderOrbitRadius,
              circleRadius: renderCircleRadius,
              dotSize: renderDotSize,
              numCircles: renderNumCircles,
              circleSpacing: renderCircleSpacing,
              growthRate: renderGrowthRate,
              tiltAmount: renderTiltAmount,
              isChannelActive,
              rotationAngle: rotationEffect.angle,
              flipY,
              stackIndex: stackIdx,
              totalStacks: totalActiveStacks,
              stackSettings: getStackSettings(stackKey),
              synthSettings: patternSynthSettings,
            };

            // Render the instrument
            renderInstrument(
              patternToRender.instrument || "orbital",
              renderCtx,
              {
                pattern: patternToRender as PatternData,
                patternLengths: patternToRender.patternLengths || patternLengths
              },
              totalHalfRotations
            );
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [view]); // Only restart animation when switching views

  // Home screen
  if (view === "home") {
    return (
      <HomeScreen
        savedRhythms={savedRhythms}
        onCreateNew={createNewRhythm}
        onLoadRhythm={loadRhythm}
        onDeleteRhythm={deleteRhythm}
        onLoadDefaultBeat={loadDefaultBeat}
      />
    );
  }

  // Fullscreen mode
  if (panelLayout.isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 group cursor-none hover:cursor-auto">
        <canvas ref={canvasRef} className="w-full h-full" />
        {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={stopPlayback} />}
        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={togglePlayPause}
              className={`px-6 py-3 rounded-lg text-lg font-medium transition-colors ${
                isPlaying ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
              }`}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button onClick={stopPlayback} className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-lg">
              ⏹
            </button>
          </div>
        </div>
        <button
          onClick={panelLayout.toggleFullscreen}
          className="absolute top-4 right-4 px-4 py-2 bg-black/80 hover:bg-black rounded-lg text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          Exit Fullscreen
        </button>
        <div className="absolute top-4 left-4 text-white/50 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div>{visualSettings.bpm} BPM</div>
          <div>Bar: {(arrangementBarRef.current + 1).toFixed(1)}</div>
        </div>
      </div>
    );
  }

  // Editor view
  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden select-none">
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={stopPlayback} />}

      <Header
        rhythmName={rhythmName}
        setRhythmName={setRhythmName}
        bpm={visualSettings.bpm}
        audioUrl={audioUrl}
        audioFileName={audioFileName}
        isPlaying={isPlaying}
        syncOffset={syncOffset}
        setSyncOffset={setSyncOffset}
        onBack={() => setView("home")}
        onSave={saveCurrentRhythm}
        onToggleFullscreen={panelLayout.toggleFullscreen}
        onAudioUpload={handleAudioUpload}
        onTogglePlayPause={togglePlayPause}
        onStop={stopPlayback}
        onSetSyncFromCurrentPosition={setSyncFromCurrentPosition}
      />

      <div className="flex flex-1 overflow-hidden">
        <ControlsPanel
          orbitRadius={visualSettings.orbitRadius}
          setOrbitRadius={visualSettings.setOrbitRadius}
          bpm={visualSettings.bpm}
          setBpm={visualSettings.setBpm}
          circleRadius={visualSettings.circleRadius}
          setCircleRadius={visualSettings.setCircleRadius}
          numCircles={visualSettings.numCircles}
          setNumCircles={visualSettings.setNumCircles}
          circleSpacing={visualSettings.circleSpacing}
          setCircleSpacing={visualSettings.setCircleSpacing}
          dotSize={visualSettings.dotSize}
          setDotSize={visualSettings.setDotSize}
          growthRate={visualSettings.growthRate}
          setGrowthRate={visualSettings.setGrowthRate}
          tiltAmount={visualSettings.tiltAmount}
          setTiltAmount={visualSettings.setTiltAmount}
          width={panelLayout.controlsPanelWidth}
          visible={panelLayout.controlsVisible}
          setVisible={panelLayout.setControlsVisible}
          onResizeStart={(e) => panelLayout.handleResizeStart("controls", e)}
          currentPatternName={arrangement.patterns.find((p) => p.id === arrangement.currentPatternId)?.name}
        />

        <div className="flex-1 flex relative bg-black">
          {/* Canvas container */}
          <div className="flex-1 relative">
            <canvas ref={canvasRef} className="absolute inset-0" />
          </div>

          {/* Synth Settings Panel - side panel on right */}
          <SynthSettingsPanel
            synthSettings={synthSettings}
            expanded={synthSettingsVisible}
            setExpanded={setSynthSettingsVisible}
            currentPatternName={arrangement.patterns.find((p) => p.id === arrangement.currentPatternId)?.name}
          />
        </div>
      </div>

      {/* Sequencer Mode Toggle */}
      <div className="bg-black/90 border-t border-gray-800 px-4 py-2 flex items-center gap-4">
        <span className="text-xs text-gray-500">Sequencer View:</span>
        <div className="flex gap-1">
          <button
            onClick={() => {
              if (sequencerMode === "midi") {
                // Sync from MIDI to patterns when switching to drum mode
                midiPatternBridge.syncFromPatterns();
              }
              setSequencerMode("drum");
            }}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              sequencerMode === "drum"
                ? "bg-cyan-600 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            }`}
          >
            Drum Machine
          </button>
          <button
            onClick={() => {
              if (sequencerMode === "drum") {
                // Sync from patterns to MIDI when switching to MIDI mode
                midiPatternBridge.syncFromPatterns();
              }
              setSequencerMode("midi");
            }}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              sequencerMode === "midi"
                ? "bg-cyan-600 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            }`}
          >
            MIDI Editor
          </button>
        </div>
        <span className="text-xs text-gray-500 ml-auto">
          Pattern: {arrangement.patterns.find((p) => p.id === arrangement.currentPatternId)?.name || "Pattern 1"}
        </span>
      </div>

      {/* Conditional Sequencer Rendering */}
      {sequencerMode === "drum" ? (
        <DrumMachine
          patterns={arrangement.patterns}
          currentPatternId={arrangement.currentPatternId}
          visibleRows={rowManagement.visibleRows}
          showAddRowMenu={rowManagement.showAddRowMenu}
          setShowAddRowMenu={rowManagement.setShowAddRowMenu}
          addRow={rowManagement.addRow}
          addEffectRow={rowManagement.addEffectRow}
          removeRow={rowManagement.removeRow}
          moveRowUp={rowManagement.moveRowUp}
          moveRowDown={rowManagement.moveRowDown}
          switchToPattern={handleSwitchToPattern}
          addNewPattern={() => arrangement.addNewPattern(getCurrentPatternData, (pattern) => {
            // Load the new pattern's synthSettings to prevent the sync useEffect from overwriting them
            if (pattern.synthSettings) {
              synthSettings.setSettings(pattern.synthSettings);
            }
          })}
          duplicatePattern={() => arrangement.duplicatePattern(getCurrentPatternData, (pattern) => {
            // Load the duplicated pattern's synthSettings
            if (pattern.synthSettings) {
              synthSettings.setSettings(pattern.synthSettings);
            }
          })}
          deletePattern={arrangement.deletePattern}
          renamePattern={arrangement.renamePattern}
          getPatternForType={patternState.getPatternForType}
          getEffectPatternForType={patternState.getEffectPatternForType}
          subdivisions={patternState.subdivisions}
          setSubdivisions={patternState.setSubdivisions}
          patternLengths={patternState.patternLengths}
          setPatternLengths={patternState.setPatternLengths}
          channelStates={channelState.channelStates}
          toggleMute={channelState.toggleMute}
          toggleSolo={channelState.toggleSolo}
          isChannelActive={channelState.isChannelActive}
          handleMouseDown={dragState.handleBooleanMouseDown}
          handleMouseEnter={dragState.handleBooleanMouseEnter}
          expanded={panelLayout.drumMachineExpanded}
          setExpanded={panelLayout.setDrumMachineExpanded}
          height={panelLayout.drumMachineHeight}
          cellWidth={panelLayout.cellWidth}
          setCellWidth={panelLayout.setCellWidth}
          onResizeStart={(e) => panelLayout.handleResizeStart("drumMachine", e)}
          instrument={patternState.instrument}
          setInstrument={patternState.setInstrument}
        />
      ) : (
        <MIDIEditor
          config={midiPatternBridge.editorConfig}
          externalNotes={midiPatternBridge.midiPattern.notes}
          onNotesChange={midiPatternBridge.updateFromMIDI}
          externalBars={midiPatternBridge.midiPattern.bars}
          patternName={arrangement.patterns.find((p) => p.id === arrangement.currentPatternId)?.name}
          expanded={panelLayout.drumMachineExpanded}
          setExpanded={panelLayout.setDrumMachineExpanded}
          height={panelLayout.drumMachineHeight}
          onResizeStart={(e) => panelLayout.handleResizeStart("drumMachine", e)}
        />
      )}

      <ArrangementTimeline
        patterns={arrangement.patterns}
        arrangement={arrangement.arrangement}
        useArrangement={arrangement.useArrangement}
        setUseArrangement={arrangement.setUseArrangement}
        addClipToArrangement={arrangement.addClipToArrangement}
        removeClipFromArrangement={arrangement.removeClipFromArrangement}
        moveClip={arrangement.moveClip}
        duplicateClip={arrangement.duplicateClip}
        getStackCount={arrangement.getStackCount}
        expanded={panelLayout.arrangementExpanded}
        setExpanded={panelLayout.setArrangementExpanded}
        height={panelLayout.arrangementHeight}
        onResizeStart={(e) => panelLayout.handleResizeStart("arrangement", e)}
        playheadRef={playheadRef}
        barDisplayRef={barDisplayRef}
        seekToBar={seekToBar}
        loopEnabled={loopEnabled}
        setLoopEnabled={setLoopEnabled}
        loopStart={loopStart}
        setLoopStart={setLoopStart}
        loopEnd={loopEnd}
        setLoopEnd={setLoopEnd}
        getStackSettings={arrangement.getStackSettings}
        updateStackSettings={arrangement.updateStackSettings}
      />
    </div>
  );
}

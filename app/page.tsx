"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Types
import type { RhythmData, PatternData, RowType } from "@/types";

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
  getPatternIndex,
  getPassedCellCount,
  cellHasHit,
  countTogglesEfficient,
  calculateDirectionAngle,
  getPositionT,
  applyPerspective,
  drawCircles,
  drawDot,
  clearCanvas,
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
} from "@/hooks";

// Components
import {
  Header,
  HomeScreen,
  ControlsPanel,
  DrumMachine,
  ArrangementTimeline,
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

  // Custom hooks
  const patternState = usePatternState();
  const visualSettings = useVisualizationSettings();
  const panelLayout = usePanelLayout();
  const channelState = useChannelState();
  const dragState = useDragState();
  const arrangement = useArrangement();
  const rowManagement = useRowManagement();

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
    directionPattern: boolean[];
    circles1VisiblePattern: boolean[];
    circles2VisiblePattern: boolean[];
    circles1PositionPattern: boolean[];
    circles2PositionPattern: boolean[];
    circlesGrowthPattern: boolean[];
    tilt3DPattern: boolean[];
    patternLengths: Record<RowType, number>;
    isChannelActive: (channel: string) => boolean;
    useArrangement: boolean;
    currentPatternId: string;
    getArrangementLength: () => number;
    getActiveClip: (bar: number) => { patternId: string } | null;
    getActivePatternForType: (type: RowType, bar: number, fallback: boolean[]) => boolean[];
    getActivePatternLengthForType: (type: RowType, bar: number, fallback: Record<RowType, number>) => number;
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
  state.directionPattern = patternState.directionPattern;
  state.circles1VisiblePattern = patternState.circles1VisiblePattern;
  state.circles2VisiblePattern = patternState.circles2VisiblePattern;
  state.circles1PositionPattern = patternState.circles1PositionPattern;
  state.circles2PositionPattern = patternState.circles2PositionPattern;
  state.circlesGrowthPattern = patternState.circlesGrowthPattern;
  state.tilt3DPattern = patternState.tilt3DPattern;
  state.patternLengths = patternState.patternLengths;
  state.isChannelActive = channelState.isChannelActive;
  state.useArrangement = arrangement.useArrangement;
  state.currentPatternId = arrangement.currentPatternId;
  state.getArrangementLength = arrangement.getArrangementLength;
  state.getActiveClip = arrangement.getActiveClip;
  state.getActivePatternForType = arrangement.getActivePatternForType;
  state.getActivePatternLengthForType = arrangement.getActivePatternLengthForType;

  // Load saved rhythms on mount
  useEffect(() => {
    setSavedRhythms(loadRhythms());
  }, []);

  // Helper to get current pattern data from editing state
  const getCurrentPatternData = useCallback((): PatternData => ({
    id: arrangement.currentPatternId,
    name: arrangement.patterns.find((p) => p.id === arrangement.currentPatternId)?.name || "Pattern 1",
    bars: arrangement.patterns.find((p) => p.id === arrangement.currentPatternId)?.bars || 4,
    directionPattern: patternState.directionPattern,
    circles1VisiblePattern: patternState.circles1VisiblePattern,
    circles2VisiblePattern: patternState.circles2VisiblePattern,
    circles1PositionPattern: patternState.circles1PositionPattern,
    circles2PositionPattern: patternState.circles2PositionPattern,
    circlesGrowthPattern: patternState.circlesGrowthPattern,
    tilt3DPattern: patternState.tilt3DPattern,
    subdivisions: patternState.subdivisions,
    patternLengths: patternState.patternLengths,
  }), [
    arrangement.currentPatternId,
    arrangement.patterns,
    patternState.directionPattern,
    patternState.circles1VisiblePattern,
    patternState.circles2VisiblePattern,
    patternState.circles1PositionPattern,
    patternState.circles2PositionPattern,
    patternState.circlesGrowthPattern,
    patternState.tilt3DPattern,
    patternState.subdivisions,
    patternState.patternLengths,
  ]);

  // Helper to build rhythm data for saving
  const buildRhythmData = useCallback((): RhythmData => {
    const currentPattern = getCurrentPatternData();
    const updatedPatterns = arrangement.patterns.map((p) =>
      p.id === arrangement.currentPatternId ? currentPattern : p
    );
    const currentArrangement = arrangement.arrangement.length > 0
      ? arrangement.arrangement
      : [{ id: generateId(), patternId: arrangement.currentPatternId, startBar: 0, length: currentPattern.bars }];

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
    };
  }, [
    getCurrentPatternData,
    arrangement.patterns,
    arrangement.currentPatternId,
    arrangement.arrangement,
    currentRhythmId,
    rhythmName,
    visualSettings,
    channelState.channelStates,
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

    arrangement.setPatterns(migrated.patterns);
    arrangement.setArrangement(migrated.arrangement);

    if (migrated.patterns.length > 0) {
      arrangement.setCurrentPatternId(migrated.patterns[0].id);
      patternState.loadPatternIntoEditor(migrated.patterns[0]);
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

    arrangement.setPatterns([newPattern]);
    arrangement.setArrangement([
      { id: generateId(), patternId: newPattern.id, startBar: 0, length: 4 },
    ]);
    arrangement.setCurrentPatternId(newPattern.id);
    patternState.loadPatternIntoEditor(newPattern);

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
        audioRef.current.currentTime = syncOffset;
        audioRef.current.play();
      }
      timeRef.current = 0;
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    timeRef.current = 0;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = syncOffset;
    }
  };

  const setSyncFromCurrentPosition = () => {
    if (audioRef.current) {
      setSyncOffset(audioRef.current.currentTime);
    }
  };

  // Pattern switching
  const handleSwitchToPattern = (patternId: string) => {
    arrangement.switchToPattern(patternId, getCurrentPatternData, patternState.loadPatternIntoEditor);
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

      clearCanvas(ctx, width, height);

      // Read all values from single ref for performance
      const state = animationStateRef.current;
      const {
        bpm, orbitRadius, circleRadius, dotSize, numCircles, circleSpacing, growthRate, tiltAmount,
        directionPattern, circles1VisiblePattern, circles2VisiblePattern,
        circles1PositionPattern, circles2PositionPattern, circlesGrowthPattern, tilt3DPattern,
        patternLengths, isChannelActive, useArrangement, currentPatternId,
        getArrangementLength, getActiveClip, getActivePatternForType, getActivePatternLengthForType,
      } = state;

      const baseAngle = timeRef.current * (bpm / 60) * Math.PI;

      // Calculate current bar position
      const beatsElapsed = timeRef.current * (bpm / 60);
      const currentBar = beatsElapsed / 4;
      const arrangementLen = getArrangementLength();

      let effectiveBar = currentBar;
      if (useArrangement && arrangementLen > 0) {
        effectiveBar = currentBar % arrangementLen;
      }

      // Update playhead
      arrangementBarRef.current = effectiveBar;
      if (playheadRef.current) {
        playheadRef.current.style.left = `${effectiveBar * 32}px`;
      }
      if (barDisplayRef.current) {
        barDisplayRef.current.textContent = effectiveBar.toFixed(1);
      }

      // Pattern lookup - maps row type to editor pattern
      const editorPatterns: Record<string, boolean[]> = {
        direction: directionPattern,
        circles1Visible: circles1VisiblePattern,
        circles2Visible: circles2VisiblePattern,
        circles1Position: circles1PositionPattern,
        circles2Position: circles2PositionPattern,
        circlesGrowth: circlesGrowthPattern,
        tilt3D: tilt3DPattern,
      };

      // Get active patterns - when in arrangement mode, check if the active clip
      // is the pattern currently being edited, and if so use live editor state
      const getPatternForType = (type: RowType): boolean[] => {
        const editorPattern = editorPatterns[type];
        if (!useArrangement || arrangementLen === 0) {
          return editorPattern;
        }
        const activeClip = getActiveClip(effectiveBar);
        if (!activeClip) {
          return Array(16).fill(false);
        }
        // If the active clip is the pattern being edited, use live editor state
        if (activeClip.patternId === currentPatternId) {
          return editorPattern;
        }
        // Otherwise get from stored patterns
        return getActivePatternForType(type, effectiveBar, editorPattern);
      };

      const getPatternLengthForTypeLocal = (type: RowType): number => {
        if (!useArrangement || arrangementLen === 0) {
          return patternLengths[type];
        }
        const activeClip = getActiveClip(effectiveBar);
        if (!activeClip) {
          return 16;
        }
        // If the active clip is the pattern being edited, use live editor state
        if (activeClip.patternId === currentPatternId) {
          return patternLengths[type];
        }
        return getActivePatternLengthForType(type, effectiveBar, patternLengths);
      };

      const activeDirectionPattern = getPatternForType("direction");
      const activeCircles1VisiblePattern = getPatternForType("circles1Visible");
      const activeCircles2VisiblePattern = getPatternForType("circles2Visible");
      const activeCircles1PositionPattern = getPatternForType("circles1Position");
      const activeCircles2PositionPattern = getPatternForType("circles2Position");
      const activeCirclesGrowthPattern = getPatternForType("circlesGrowth");
      const activeTilt3DPattern = getPatternForType("tilt3D");

      const activePatternLengths = {
        direction: getPatternLengthForTypeLocal("direction"),
        circles1Visible: getPatternLengthForTypeLocal("circles1Visible"),
        circles2Visible: getPatternLengthForTypeLocal("circles2Visible"),
        circles1Position: getPatternLengthForTypeLocal("circles1Position"),
        circles2Position: getPatternLengthForTypeLocal("circles2Position"),
        circlesGrowth: getPatternLengthForTypeLocal("circlesGrowth"),
        tilt3D: getPatternLengthForTypeLocal("tilt3D"),
      };

      const halfRotation = ANIMATION.HALF_ROTATION;
      const totalHalfRotations = baseAngle / halfRotation;

      // Direction calculation
      const directionActive = isChannelActive("direction");
      const dirBaseLen = activePatternLengths.direction;
      const dirScaleFactor = activeDirectionPattern.length / dirBaseLen;
      const dirPassedCells = getPassedCellCount(activeDirectionPattern, totalHalfRotations, dirBaseLen);
      const dirCurrentCell = dirPassedCells % activeDirectionPattern.length;
      const dirCellProgress = (totalHalfRotations * dirScaleFactor) % 1;
      const halfRotsPerCell = 1 / dirScaleFactor;

      const { angle: baseAngleCalc, currentDir } = calculateDirectionAngle(
        activeDirectionPattern,
        dirPassedCells,
        halfRotsPerCell,
        halfRotation,
        directionActive
      );

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

      // Visibility
      const circles1VisActive = isChannelActive("circles1Visible");
      const circles2VisActive = isChannelActive("circles2Visible");
      const { idx: c1VisIdx } = getPatternIndex(activeCircles1VisiblePattern, totalHalfRotations, activePatternLengths.circles1Visible);
      const { idx: c2VisIdx } = getPatternIndex(activeCircles2VisiblePattern, totalHalfRotations, activePatternLengths.circles2Visible);
      const circles1Visible = circles1VisActive ? activeCircles1VisiblePattern[c1VisIdx] : true;
      const circles2Visible = circles2VisActive ? activeCircles2VisiblePattern[c2VisIdx] : true;

      // Position
      const circles1PosActive = isChannelActive("circles1Position");
      const circles2PosActive = isChannelActive("circles2Position");
      const circles1T = getPositionT(activeCircles1PositionPattern, totalHalfRotations, activePatternLengths.circles1Position, circles1PosActive);
      const circles2T = getPositionT(activeCircles2PositionPattern, totalHalfRotations, activePatternLengths.circles2Position, circles2PosActive);

      // Growth
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

      // 3D Tilt
      const tilt3DActive = isChannelActive("tilt3D");
      let tiltEnabled = false;
      let currentTiltAngle = 0;
      if (tilt3DActive) {
        const passedCells = getPassedCellCount(activeTilt3DPattern, totalHalfRotations, activePatternLengths.tilt3D);
        const toggleCount = countTogglesEfficient(activeTilt3DPattern, passedCells);
        tiltEnabled = toggleCount % 2 === 1;
        if (tiltEnabled) {
          currentTiltAngle = (totalHalfRotations / 4) * Math.PI * 2 * (tiltAmount / 45);
        }
      }

      const axisAngle = angle;

      // Draw circles 1
      if (circles1Visible) {
        const center1X = dot1ScreenX + (width / 2 - dot1ScreenX) * circles1T;
        const center1Y = dot1ScreenY + (height / 2 - dot1ScreenY) * circles1T;
        const baseRadius1 = circleRadius + (orbitRadius / 2 - circleRadius) * circles1T;
        const p1 = applyPerspective(center1X, center1Y, width / 2, height / 2, tiltEnabled, axisAngle, currentTiltAngle);
        drawCircles({
          ctx,
          centerX: center1X,
          centerY: center1Y,
          baseRadius: baseRadius1,
          numCircles,
          circleSpacing,
          growthEnabled,
          growthOffset,
          tiltEnabled,
          currentTiltAngle,
          axisAngle,
          perspective: p1,
          canvasWidth: width,
          canvasHeight: height,
        });
      }

      // Draw circles 2
      if (circles2Visible) {
        const center2X = dot2ScreenX + (width / 2 - dot2ScreenX) * circles2T;
        const center2Y = dot2ScreenY + (height / 2 - dot2ScreenY) * circles2T;
        const baseRadius2 = circleRadius + (orbitRadius / 2 - circleRadius) * circles2T;
        const p2 = applyPerspective(center2X, center2Y, width / 2, height / 2, tiltEnabled, axisAngle, currentTiltAngle);
        drawCircles({
          ctx,
          centerX: center2X,
          centerY: center2Y,
          baseRadius: baseRadius2,
          numCircles,
          circleSpacing,
          growthEnabled,
          growthOffset,
          tiltEnabled,
          currentTiltAngle,
          axisAngle,
          perspective: p2,
          canvasWidth: width,
          canvasHeight: height,
        });
      }

      // Draw dots
      const dot1P = applyPerspective(dot1ScreenX, dot1ScreenY, width / 2, height / 2, tiltEnabled, axisAngle, currentTiltAngle);
      const dot2P = applyPerspective(dot2ScreenX, dot2ScreenY, width / 2, height / 2, tiltEnabled, axisAngle, currentTiltAngle);
      drawDot(ctx, dot1ScreenX, dot1ScreenY, dotSize, dot1P, tiltEnabled);
      drawDot(ctx, dot2ScreenX, dot2ScreenY, dotSize, dot2P, tiltEnabled);

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
        />

        <div className="flex-1 relative bg-black">
          <canvas ref={canvasRef} className="absolute inset-0" />
        </div>
      </div>

      <DrumMachine
        patterns={arrangement.patterns}
        currentPatternId={arrangement.currentPatternId}
        visibleRows={rowManagement.visibleRows}
        showAddRowMenu={rowManagement.showAddRowMenu}
        setShowAddRowMenu={rowManagement.setShowAddRowMenu}
        addRow={rowManagement.addRow}
        removeRow={rowManagement.removeRow}
        moveRowUp={rowManagement.moveRowUp}
        moveRowDown={rowManagement.moveRowDown}
        switchToPattern={handleSwitchToPattern}
        addNewPattern={() => arrangement.addNewPattern(getCurrentPatternData)}
        duplicatePattern={() => arrangement.duplicatePattern(getCurrentPatternData)}
        deletePattern={arrangement.deletePattern}
        renamePattern={arrangement.renamePattern}
        getPatternForType={patternState.getPatternForType}
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
      />

      <ArrangementTimeline
        patterns={arrangement.patterns}
        arrangement={arrangement.arrangement}
        useArrangement={arrangement.useArrangement}
        setUseArrangement={arrangement.setUseArrangement}
        addClipToArrangement={arrangement.addClipToArrangement}
        removeClipFromArrangement={arrangement.removeClipFromArrangement}
        moveClip={arrangement.moveClip}
        expanded={panelLayout.arrangementExpanded}
        setExpanded={panelLayout.setArrangementExpanded}
        height={panelLayout.arrangementHeight}
        onResizeStart={(e) => panelLayout.handleResizeStart("arrangement", e)}
        playheadRef={playheadRef}
        barDisplayRef={barDisplayRef}
      />
    </div>
  );
}

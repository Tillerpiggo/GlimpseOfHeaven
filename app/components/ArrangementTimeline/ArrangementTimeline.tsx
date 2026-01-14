/**
 * ArrangementTimeline component for organizing patterns
 */

import { useState } from "react";
import type { PatternData, ArrangementClip, StackSettings } from "@/types";
import { INSTRUMENT_INFO } from "@/constants";

// Stack settings panel component
function StackSettingsPanel({
  stackIndex,
  settings,
  updateSettings,
}: {
  stackIndex: number;
  settings: StackSettings;
  updateSettings: (settings: Partial<StackSettings>) => void;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 mb-3 border border-gray-700">
      <div className="text-xs text-gray-400 mb-2 font-medium">
        Stack {stackIndex + 1} Settings
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Flip Y */}
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={settings.flipY}
            onChange={(e) => updateSettings({ flipY: e.target.checked })}
            className="accent-orange-500"
          />
          <span className="text-gray-300">Flip Y</span>
        </label>

        {/* Scale */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500">Scale</label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={settings.scale}
            onChange={(e) => updateSettings({ scale: parseFloat(e.target.value) })}
            className="w-full accent-orange-500"
          />
          <span className="text-[10px] text-gray-400 text-center">{settings.scale.toFixed(1)}x</span>
        </div>

        {/* Offset X */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500">Offset X</label>
          <input
            type="range"
            min="-200"
            max="200"
            step="10"
            value={settings.offsetX}
            onChange={(e) => updateSettings({ offsetX: parseInt(e.target.value) })}
            className="w-full accent-orange-500"
          />
          <span className="text-[10px] text-gray-400 text-center">{settings.offsetX}px</span>
        </div>

        {/* Offset Y */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500">Offset Y</label>
          <input
            type="range"
            min="-200"
            max="200"
            step="10"
            value={settings.offsetY}
            onChange={(e) => updateSettings({ offsetY: parseInt(e.target.value) })}
            className="w-full accent-orange-500"
          />
          <span className="text-[10px] text-gray-400 text-center">{settings.offsetY}px</span>
        </div>

        {/* Opacity */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500">Opacity</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.opacity}
            onChange={(e) => updateSettings({ opacity: parseFloat(e.target.value) })}
            className="w-full accent-orange-500"
          />
          <span className="text-[10px] text-gray-400 text-center">{Math.round(settings.opacity * 100)}%</span>
        </div>

        {/* Rotation */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500">Rotation</label>
          <input
            type="range"
            min="0"
            max="360"
            step="15"
            value={settings.rotation}
            onChange={(e) => updateSettings({ rotation: parseInt(e.target.value) })}
            className="w-full accent-orange-500"
          />
          <span className="text-[10px] text-gray-400 text-center">{settings.rotation}°</span>
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={() => updateSettings({
          flipY: false,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          opacity: 1,
          rotation: 0,
        })}
        className="mt-2 px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
      >
        Reset to Defaults
      </button>
    </div>
  );
}

export type ArrangementTimelineProps = {
  patterns: PatternData[];
  arrangement: ArrangementClip[];
  useArrangement: boolean;
  setUseArrangement: (v: boolean) => void;
  addClipToArrangement: (patternId: string, stack?: number) => void;
  removeClipFromArrangement: (clipId: string) => void;
  moveClip: (clipId: string, newStartBar: number, newStack?: number) => void;
  duplicateClip: (clipId: string, newStartBar: number, newStack?: number) => void;
  getStackCount: () => number;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  height: number;
  onResizeStart: (e: React.MouseEvent) => void;
  playheadRef: React.RefObject<HTMLDivElement | null>;
  barDisplayRef: React.RefObject<HTMLSpanElement | null>;
  // Scrubbing and looping
  seekToBar: (bar: number) => void;
  loopEnabled: boolean;
  setLoopEnabled: (v: boolean) => void;
  loopStart: number;
  setLoopStart: (v: number) => void;
  loopEnd: number;
  setLoopEnd: (v: number) => void;
  // Stack settings
  getStackSettings: (stackIndex: number) => StackSettings;
  updateStackSettings: (stackIndex: number, settings: Partial<StackSettings>) => void;
};

export function ArrangementTimeline({
  patterns,
  arrangement,
  useArrangement,
  setUseArrangement,
  addClipToArrangement,
  removeClipFromArrangement,
  moveClip,
  duplicateClip,
  getStackCount,
  expanded,
  setExpanded,
  height,
  onResizeStart,
  playheadRef,
  barDisplayRef,
  seekToBar,
  loopEnabled,
  setLoopEnabled,
  loopStart,
  setLoopStart,
  loopEnd,
  setLoopEnd,
  getStackSettings,
  updateStackSettings,
}: ArrangementTimelineProps) {
  const [selectedStack, setSelectedStack] = useState(0);
  const [isDraggingLoop, setIsDraggingLoop] = useState<"start" | "end" | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showStackSettings, setShowStackSettings] = useState(false);
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);

  // Convert pixel position to bar number (accounting for 64px offset)
  const pixelToBar = (pixelX: number, containerRect: DOMRect) => {
    const relativeX = pixelX - containerRect.left - 64; // 64px for stack labels
    return Math.max(0, relativeX / 32);
  };

  // Handle scrubbing on the timeline ruler
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const bar = pixelToBar(e.clientX, rect);
    seekToBar(bar);
    setIsScrubbing(true);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrubbing && !isDraggingLoop) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const bar = pixelToBar(e.clientX, rect);

    if (isScrubbing) {
      seekToBar(bar);
    } else if (isDraggingLoop === "start") {
      setLoopStart(Math.min(bar, loopEnd - 0.5));
    } else if (isDraggingLoop === "end") {
      setLoopEnd(Math.max(bar, loopStart + 0.5));
    }
  };

  const handleTimelineMouseUp = () => {
    setIsScrubbing(false);
    setIsDraggingLoop(null);
  };

  const handleTimelineMouseLeave = () => {
    setIsScrubbing(false);
    setIsDraggingLoop(null);
  };

  const timelineLength = Math.max(
    16,
    arrangement.reduce((max, c) => Math.max(max, c.startBar + c.length), 0) + 4
  );

  const stackCount = getStackCount();

  const colors = [
    "bg-cyan-600",
    "bg-purple-600",
    "bg-green-600",
    "bg-orange-600",
    "bg-pink-600",
    "bg-blue-600",
  ];

  return (
    <div className="bg-black/80 border-t border-gray-800 relative flex-shrink-0">
      {/* Resize handle */}
      {expanded && (
        <div
          className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-cyan-500/50 transition-colors z-10"
          onMouseDown={onResizeStart}
        />
      )}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-white/5"
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="text-sm font-semibold">Arrangement</h2>
        <span className="text-gray-400">{expanded ? "▼" : "▲"}</span>
      </div>

      {expanded && (
        <div
          className="px-4 pb-4 overflow-x-auto overflow-y-auto"
          style={{ maxHeight: height }}
        >
          {/* Pattern library for dragging */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500">Add to stack {selectedStack + 1}:</span>
            <div className="flex gap-1 flex-wrap">
              {patterns.map((pattern) => (
                <button
                  key={pattern.id}
                  onClick={() => addClipToArrangement(pattern.id, selectedStack)}
                  className="px-3 py-1 text-xs bg-cyan-700 hover:bg-cyan-600 rounded flex items-center gap-1"
                  title={`Add ${pattern.name} (${INSTRUMENT_INFO[pattern.instrument || "orbital"].label}) to stack ${selectedStack + 1}`}
                >
                  + {pattern.name}
                  <span className="text-[10px] opacity-70">
                    ({INSTRUMENT_INFO[pattern.instrument || "orbital"].label})
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => addClipToArrangement(patterns[0]?.id || "", stackCount)}
              className="px-2 py-1 text-xs bg-violet-700 hover:bg-violet-600 rounded"
              title="Add new stack"
            >
              + Stack
            </button>
            <button
              onClick={() => setShowStackSettings(!showStackSettings)}
              className={`px-2 py-1 text-xs rounded ml-2 ${
                showStackSettings
                  ? "bg-orange-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
              title="Stack settings"
            >
              Settings
            </button>
          </div>

          {/* Stack settings panel */}
          {showStackSettings && (
            <StackSettingsPanel
              stackIndex={selectedStack}
              settings={getStackSettings(selectedStack)}
              updateSettings={(settings) => updateStackSettings(selectedStack, settings)}
            />
          )}

          {/* Timeline */}
          <div
            className="bg-gray-900 rounded-lg p-3 min-h-[80px]"
            onMouseMove={handleTimelineMouseMove}
            onMouseUp={handleTimelineMouseUp}
            onMouseLeave={handleTimelineMouseLeave}
          >
            {arrangement.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4">
                Click a pattern above to add it to the timeline
              </div>
            ) : (
              <div className="relative">
                {/* Bar markers / Ruler - clickable for scrubbing */}
                <div
                  className="border-b border-gray-700 pb-1 mb-2 ml-16 cursor-pointer select-none relative"
                  style={{ width: `${timelineLength * 32}px` }}
                  onMouseDown={handleTimelineMouseDown}
                >
                  <div className="flex">
                    {Array.from({ length: timelineLength }, (_, i) => {
                      const isInLoop = loopEnabled && i >= loopStart && i < loopEnd;
                      return (
                        <div
                          key={i}
                          className={`w-8 text-center text-[10px] flex-shrink-0 ${
                            isInLoop
                              ? "text-yellow-400 font-medium"
                              : "text-gray-600 hover:text-gray-400"
                          }`}
                        >
                          {i + 1}
                        </div>
                      );
                    })}
                  </div>

                  {/* Loop region indicator on ruler - golden bar */}
                  {loopEnabled && (
                    <div
                      className="absolute top-0 bottom-0 bg-gradient-to-b from-yellow-500/30 to-yellow-600/20 border-l-2 border-r-2 border-yellow-500 pointer-events-none rounded-b"
                      style={{
                        left: `${loopStart * 32}px`,
                        width: `${(loopEnd - loopStart) * 32}px`,
                      }}
                    />
                  )}
                </div>

                {/* Loop handles */}
                {loopEnabled && (
                  <>
                    {/* Loop start handle */}
                    <div
                      className="absolute top-0 w-3 h-5 bg-yellow-500 cursor-ew-resize z-30 rounded-sm hover:bg-yellow-400 flex items-center justify-center"
                      style={{ left: `${64 + loopStart * 32 - 6}px` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setIsDraggingLoop("start");
                      }}
                      title="Loop start"
                    >
                      <span className="text-[8px] text-black font-bold">[</span>
                    </div>
                    {/* Loop end handle */}
                    <div
                      className="absolute top-0 w-3 h-5 bg-yellow-500 cursor-ew-resize z-30 rounded-sm hover:bg-yellow-400 flex items-center justify-center"
                      style={{ left: `${64 + loopEnd * 32 - 6}px` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setIsDraggingLoop("end");
                      }}
                      title="Loop end"
                    >
                      <span className="text-[8px] text-black font-bold">]</span>
                    </div>
                  </>
                )}

                {/* Stack rows */}
                {Array.from({ length: stackCount }, (_, stackIndex) => {
                  const stackClips = arrangement.filter((c) => (c.stack ?? 0) === stackIndex);

                  return (
                    <div key={stackIndex} className="flex mb-1">
                      {/* Stack label */}
                      <div
                        className={`w-16 flex-shrink-0 flex items-center justify-center text-xs cursor-pointer rounded-l ${
                          selectedStack === stackIndex
                            ? "bg-violet-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                        onClick={() => setSelectedStack(stackIndex)}
                      >
                        Stack {stackIndex + 1}
                      </div>

                      {/* Clips area for this stack */}
                      <div
                        className="relative h-10 bg-gray-800/50 rounded-r"
                        style={{ width: `${timelineLength * 32}px`, minWidth: "100%" }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const clipId = e.dataTransfer.getData("clipId");
                          if (!clipId) return;

                          const grabOffset = parseInt(
                            e.dataTransfer.getData("grabOffset") || "0",
                            10
                          );
                          const rect = e.currentTarget.getBoundingClientRect();
                          const dropX = e.clientX - rect.left;
                          const newBar = Math.max(
                            0,
                            Math.round((dropX - grabOffset) / 32)
                          );

                          // Option/Alt key = duplicate, otherwise move
                          if (e.altKey) {
                            duplicateClip(clipId, newBar, stackIndex);
                          } else {
                            moveClip(clipId, newBar, stackIndex);
                          }
                          setDraggedClipId(null);
                        }}
                      >
                        {/* Loop region highlight on this stack */}
                        {loopEnabled && (
                          <div
                            className="absolute top-0 bottom-0 bg-yellow-500/15 pointer-events-none"
                            style={{
                              left: `${loopStart * 32}px`,
                              width: `${(loopEnd - loopStart) * 32}px`,
                            }}
                          />
                        )}

                        {stackClips.map((clip) => {
                          const pattern = patterns.find((p) => p.id === clip.patternId);
                          const patternIndex = patterns.findIndex(
                            (p) => p.id === clip.patternId
                          );
                          const bgColor = colors[patternIndex % colors.length];
                          const isDragging = draggedClipId === clip.id;

                          return (
                            <div
                              key={clip.id}
                              className={`absolute top-0 h-10 ${bgColor} rounded flex items-center justify-between px-2 cursor-grab active:cursor-grabbing group select-none transition-opacity ${
                                isDragging ? "opacity-50" : ""
                              }`}
                              style={{
                                left: `${clip.startBar * 32}px`,
                                width: `${clip.length * 32 - 4}px`,
                              }}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("clipId", clip.id);
                                const rect = e.currentTarget.getBoundingClientRect();
                                const grabOffset = e.clientX - rect.left;
                                e.dataTransfer.setData(
                                  "grabOffset",
                                  String(grabOffset)
                                );
                                e.dataTransfer.effectAllowed = e.altKey ? "copy" : "move";
                                setDraggedClipId(clip.id);
                              }}
                              onDragEnd={() => setDraggedClipId(null)}
                            >
                              <span className="text-xs font-medium truncate pointer-events-none">
                                {pattern?.name || "?"}
                              </span>
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
                      </div>
                    </div>
                  );
                })}

                {/* Playhead */}
                <div
                  ref={playheadRef}
                  className="absolute top-6 h-full w-0.5 bg-red-500 z-20 pointer-events-none"
                  style={{ left: "64px" }}
                >
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-red-500" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span>Drag clips to move. <span className="text-orange-400">Option+drag</span> to duplicate.</span>
              <span className="text-cyan-400">
                Bar: <span ref={barDisplayRef}>0.0</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Loop controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLoopEnabled(!loopEnabled)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    loopEnabled
                      ? "bg-yellow-600 text-black"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                  title="Toggle loop"
                >
                  Loop
                </button>
                {loopEnabled && (
                  <span className="text-yellow-400">
                    {loopStart.toFixed(1)} - {loopEnd.toFixed(1)}
                  </span>
                )}
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
        </div>
      )}
    </div>
  );
}

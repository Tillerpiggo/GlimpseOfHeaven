/**
 * ArrangementTimeline component for organizing patterns
 */

import { useRef } from "react";
import type { PatternData, ArrangementClip } from "@/types";

export type ArrangementTimelineProps = {
  patterns: PatternData[];
  arrangement: ArrangementClip[];
  useArrangement: boolean;
  setUseArrangement: (v: boolean) => void;
  addClipToArrangement: (patternId: string) => void;
  removeClipFromArrangement: (clipId: string) => void;
  moveClip: (clipId: string, newStartBar: number) => void;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  height: number;
  onResizeStart: (e: React.MouseEvent) => void;
  playheadRef: React.RefObject<HTMLDivElement | null>;
  barDisplayRef: React.RefObject<HTMLSpanElement | null>;
};

export function ArrangementTimeline({
  patterns,
  arrangement,
  useArrangement,
  setUseArrangement,
  addClipToArrangement,
  removeClipFromArrangement,
  moveClip,
  expanded,
  setExpanded,
  height,
  onResizeStart,
  playheadRef,
  barDisplayRef,
}: ArrangementTimelineProps) {
  const timelineLength = Math.max(
    16,
    arrangement.reduce((max, c) => Math.max(max, c.startBar + c.length), 0) + 4
  );

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
                  {Array.from({ length: timelineLength }, (_, i) => (
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
                    moveClip(clipId, newBar);
                  }}
                >
                  {arrangement.map((clip) => {
                    const pattern = patterns.find((p) => p.id === clip.patternId);
                    const patternIndex = patterns.findIndex(
                      (p) => p.id === clip.patternId
                    );
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
                          const rect = e.currentTarget.getBoundingClientRect();
                          const grabOffset = e.clientX - rect.left;
                          e.dataTransfer.setData(
                            "grabOffset",
                            String(grabOffset)
                          );
                          e.dataTransfer.effectAllowed = "move";
                        }}
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
              <span className="text-cyan-400">
                Bar: <span ref={barDisplayRef}>0.0</span>
              </span>
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
  );
}

/**
 * Velocity Lane component - displays and allows editing of note velocities
 */

import { useCallback, useRef } from "react";
import type { MIDINote, MIDIEditorViewSettings } from "@/types";
import { ticksToPixels } from "@/utils";

export type VelocityLaneProps = {
  notes: MIDINote[];
  viewSettings: MIDIEditorViewSettings;
  bars: number;
  ticksPerBeat: number;
  selectedNoteIds: Set<string>;
  onVelocityChange: (noteIds: string[], velocity: number) => void;
  height?: number;
};

export function VelocityLane({
  notes,
  viewSettings,
  bars,
  ticksPerBeat,
  selectedNoteIds,
  onVelocityChange,
  height = 60,
}: VelocityLaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const { horizontalZoom, scrollX } = viewSettings;
  const totalTicks = bars * 4 * ticksPerBeat;
  const gridWidth = ticksToPixels(totalTicks, horizontalZoom, ticksPerBeat);

  const handleMouseDown = useCallback(
    (noteId: string, e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const y = moveEvent.clientY - rect.top;
        const velocity = Math.max(1, Math.min(127, Math.round((1 - y / height) * 127)));

        const notesToUpdate = selectedNoteIds.has(noteId)
          ? Array.from(selectedNoteIds)
          : [noteId];

        onVelocityChange(notesToUpdate, velocity);
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      // Initial update
      handleMouseMove(e.nativeEvent);
    },
    [height, selectedNoteIds, onVelocityChange]
  );

  return (
    <div
      ref={containerRef}
      className="border-t border-gray-700 bg-gray-900/50 relative overflow-hidden"
      style={{ height }}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0"
        style={{
          width: gridWidth,
          transform: `translateX(${-scrollX}px)`,
        }}
      >
        {/* Horizontal reference lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <div
            key={ratio}
            className="absolute left-0 right-0 border-t border-gray-700/30"
            style={{ top: `${ratio * 100}%` }}
          />
        ))}

        {/* Velocity bars */}
        {notes.map((note) => {
          const noteX = ticksToPixels(note.startTick, horizontalZoom, ticksPerBeat);
          const noteWidth = Math.max(
            8,
            ticksToPixels(note.duration, horizontalZoom, ticksPerBeat) - 2
          );
          const velocityHeight = (note.velocity / 127) * height;
          const isSelected = selectedNoteIds.has(note.id);

          return (
            <div
              key={note.id}
              className={`
                absolute bottom-0 cursor-ns-resize transition-colors
                ${isSelected ? "bg-orange-500/80" : "bg-cyan-500/60"}
                hover:bg-cyan-400/80
              `}
              style={{
                left: noteX + 1,
                width: noteWidth - 2,
                height: velocityHeight,
              }}
              onMouseDown={(e) => handleMouseDown(note.id, e)}
            >
              {/* Velocity value tooltip on hover */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 opacity-0 hover:opacity-100 whitespace-nowrap">
                {note.velocity}
              </div>
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="absolute right-1 top-0 text-[9px] text-gray-500">127</div>
      <div className="absolute right-1 bottom-0 text-[9px] text-gray-500">0</div>
    </div>
  );
}

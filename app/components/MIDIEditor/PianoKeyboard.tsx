/**
 * Piano keyboard sidebar for the MIDI editor
 */

import { useMemo } from "react";
import type { PianoKey, MIDIEditorConfig } from "@/types";
import { getPianoKeys, GM_DRUM_LABELS } from "@/utils";

export type PianoKeyboardProps = {
  noteRange: { low: number; high: number };
  verticalZoom: number;
  scrollY: number;
  config?: MIDIEditorConfig;
  onKeyClick?: (note: number) => void;
  highlightedNotes?: Set<number>;
};

export function PianoKeyboard({
  noteRange,
  verticalZoom,
  scrollY,
  config,
  onKeyClick,
  highlightedNotes = new Set(),
}: PianoKeyboardProps) {
  const keys = useMemo(
    () => getPianoKeys(noteRange.low, noteRange.high),
    [noteRange.low, noteRange.high]
  );

  const isDrumMode = config?.type === "drums";
  const keyboardWidth = isDrumMode ? 100 : 60;

  return (
    <div
      className="flex-shrink-0 bg-gray-900 border-r border-gray-700 overflow-hidden"
      style={{ width: keyboardWidth }}
    >
      <div
        className="relative"
        style={{
          height: keys.length * verticalZoom,
          transform: `translateY(${-scrollY}px)`,
        }}
      >
        {keys.map((key) => {
          const isHighlighted = highlightedNotes.has(key.note);
          const label = isDrumMode
            ? (config?.drumLabels?.[key.note] ?? GM_DRUM_LABELS[key.note] ?? key.name)
            : key.name;

          return (
            <div
              key={key.note}
              className={`
                absolute left-0 right-0 border-b border-gray-800 flex items-center
                cursor-pointer select-none transition-colors
                ${key.isBlack && !isDrumMode
                  ? "bg-gray-800 hover:bg-gray-700"
                  : "bg-gray-900 hover:bg-gray-800"
                }
                ${isHighlighted ? "bg-cyan-900/50" : ""}
              `}
              style={{
                top: (noteRange.high - key.note) * verticalZoom,
                height: verticalZoom,
              }}
              onClick={() => onKeyClick?.(key.note)}
            >
              {isDrumMode ? (
                <span
                  className="text-[9px] text-gray-400 truncate px-1 w-full"
                  title={label}
                >
                  {label}
                </span>
              ) : (
                <>
                  {/* Visual piano key representation */}
                  {key.isBlack ? (
                    <div className="w-8 h-full bg-gray-950 rounded-r-sm" />
                  ) : (
                    <div className="w-10 h-full bg-gray-100/90 rounded-r-sm border-b border-gray-300" />
                  )}
                  {/* Note name label */}
                  <span
                    className={`
                      text-[10px] ml-1 font-mono
                      ${key.isBlack ? "text-gray-400" : "text-gray-500"}
                      ${key.note % 12 === 0 ? "font-bold text-cyan-400" : ""}
                    `}
                  >
                    {key.name}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

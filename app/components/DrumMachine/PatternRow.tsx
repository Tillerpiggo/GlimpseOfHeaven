/**
 * PatternRow component for the drum machine sequencer
 * Displays a single row with mute/solo, subdivision, length, and pattern cells
 */

import type { ChannelState } from "@/types";

export type PatternRowProps = {
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
  handleMouseDown: (
    row: string,
    index: number,
    pattern: boolean[],
    setPattern: (p: boolean[]) => void
  ) => void;
  handleMouseEnter: (
    row: string,
    index: number,
    pattern: boolean[],
    setPattern: (p: boolean[]) => void
  ) => void;
  hitSymbol: string;
  hitColor: string;
  cellWidth: number;
};

export function PatternRow({
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
}: PatternRowProps) {
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
            state?.solo
              ? "bg-yellow-500 text-black"
              : "bg-gray-600 hover:bg-gray-500"
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
              onMouseEnter={() =>
                handleMouseEnter(channel, i, pattern, setPattern)
              }
              style={{
                width: actualCellWidth,
                minWidth: actualCellWidth,
                height: 28,
                fontSize: actualCellWidth < 20 ? "8px" : "12px",
              }}
              className={`rounded font-bold transition-colors ${
                val ? hitColor : "bg-gray-700 hover:bg-gray-600"
              } ${!active ? "opacity-50" : ""} ${
                isDownbeat ? "border-l-2 border-white/30" : ""
              }`}
            >
              {actualCellWidth >= 14 ? (val ? hitSymbol : "·") : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

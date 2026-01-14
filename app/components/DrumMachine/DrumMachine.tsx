/**
 * DrumMachine component for pattern editing
 */

import type { PatternData, RowType, RowConfig, ChannelState, PatternLengths, Subdivisions, InstrumentType, EffectRowType } from "@/types";
import { ROW_TYPE_INFO, SUBDIVISION_OPTIONS, PATTERN_LENGTH_OPTIONS, INSTRUMENT_INFO, EFFECT_ROW_TYPE_INFO } from "@/constants";
import { resizePattern } from "@/utils";
import { PatternRow } from "./PatternRow";

export type DrumMachineProps = {
  // Pattern data
  patterns: PatternData[];
  currentPatternId: string;
  // Row management
  visibleRows: RowConfig[];
  showAddRowMenu: boolean;
  setShowAddRowMenu: (v: boolean) => void;
  addRow: (type: RowType) => void;
  addEffectRow: (type: EffectRowType) => void;
  removeRow: (rowId: string) => void;
  moveRowUp: (rowId: string) => void;
  moveRowDown: (rowId: string) => void;
  // Pattern management
  switchToPattern: (patternId: string) => void;
  addNewPattern: () => void;
  duplicatePattern: () => void;
  deletePattern: (patternId: string) => void;
  renamePattern: (patternId: string, newName: string) => void;
  // Instrument
  instrument: InstrumentType;
  setInstrument: (i: InstrumentType) => void;
  // Pattern state
  getPatternForType: (type: RowType) => {
    pattern: boolean[];
    setPattern: (p: boolean[]) => void;
  };
  getEffectPatternForType: (type: EffectRowType) => {
    pattern: boolean[];
    setPattern: (p: boolean[]) => void;
  };
  subdivisions: Subdivisions;
  setSubdivisions: (s: Subdivisions) => void;
  patternLengths: PatternLengths;
  setPatternLengths: (p: PatternLengths) => void;
  // Channel state
  channelStates: Record<string, ChannelState>;
  toggleMute: (c: string) => void;
  toggleSolo: (c: string) => void;
  isChannelActive: (c: string) => boolean;
  // Drag handling
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
  // Layout
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  height: number;
  cellWidth: number;
  setCellWidth: (v: number) => void;
  onResizeStart: (e: React.MouseEvent) => void;
};

function formatSubdivision(value: number): string {
  if (value === 0.25) return "¼×";
  if (value === 0.5) return "½×";
  if (value === 1) return "1×";
  if (value === 2) return "2×";
  if (value === 4) return "4×";
  return `${value}×`;
}

export function DrumMachine({
  patterns,
  currentPatternId,
  visibleRows,
  showAddRowMenu,
  setShowAddRowMenu,
  addRow,
  addEffectRow,
  removeRow,
  moveRowUp,
  moveRowDown,
  switchToPattern,
  addNewPattern,
  duplicatePattern,
  deletePattern,
  renamePattern,
  instrument,
  setInstrument,
  getPatternForType,
  getEffectPatternForType,
  subdivisions,
  setSubdivisions,
  patternLengths,
  setPatternLengths,
  channelStates,
  toggleMute,
  toggleSolo,
  isChannelActive,
  handleMouseDown,
  handleMouseEnter,
  expanded,
  setExpanded,
  height,
  cellWidth,
  setCellWidth,
  onResizeStart,
}: DrumMachineProps) {
  // Subdivision changes number of cells per beat
  const cycleSubdivision = (
    row: RowType,
    pattern: boolean[],
    setPattern: (p: boolean[]) => void
  ) => {
    const currentSub = subdivisions[row];
    const baseLen = patternLengths[row];
    const currentIndex = SUBDIVISION_OPTIONS.indexOf(currentSub as typeof SUBDIVISION_OPTIONS[number]);
    const nextIndex = (currentIndex + 1) % SUBDIVISION_OPTIONS.length;
    const newSub = SUBDIVISION_OPTIONS[nextIndex];

    // Calculate new total cells and resize pattern
    const newTotalCells = Math.round(baseLen * newSub);
    const currentTotalCells = pattern.length;

    if (newTotalCells !== currentTotalCells) {
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
  const cyclePatternLength = (
    row: RowType,
    pattern: boolean[],
    setPattern: (p: boolean[]) => void
  ) => {
    const current = patternLengths[row];
    const currentSub = subdivisions[row];
    const currentIndex = PATTERN_LENGTH_OPTIONS.indexOf(current as typeof PATTERN_LENGTH_OPTIONS[number]);
    const nextIndex = (currentIndex + 1) % PATTERN_LENGTH_OPTIONS.length;
    const newBaseLength = PATTERN_LENGTH_OPTIONS[nextIndex];

    // Calculate new total cells
    const newTotalCells = Math.round(newBaseLength * currentSub);
    setPattern(resizePattern(pattern, newTotalCells));
    setPatternLengths({ ...patternLengths, [row]: newBaseLength });
  };

  return (
    <div className="bg-black/90 border-t border-gray-800 relative flex-shrink-0">
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
        <h2 className="text-sm font-semibold">Pattern Sequencer</h2>
        <span className="text-gray-400">{expanded ? "▼" : "▲"}</span>
      </div>

      {expanded && (
        <div
          className="px-4 pb-4 overflow-x-auto overflow-y-auto"
          style={{ maxHeight: height }}
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

            {/* Instrument selector */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-500">Instrument:</span>
              <select
                value={instrument}
                onChange={(e) => setInstrument(e.target.value as InstrumentType)}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white border-none cursor-pointer"
              >
                {Object.entries(INSTRUMENT_INFO).map(([type, info]) => (
                  <option key={type} value={type}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={patterns.find((p) => p.id === currentPatternId)?.name || ""}
              onChange={(e) => renamePattern(currentPatternId, e.target.value)}
              className="ml-3 px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded w-32"
              placeholder="Pattern name"
            />
          </div>

          <div className="space-y-2 min-w-max">
            {/* Dynamic rows */}
            {visibleRows.map((row, index) => {
              const isEffect = row.isEffect === true;
              const info = isEffect
                ? EFFECT_ROW_TYPE_INFO[row.type as EffectRowType]
                : ROW_TYPE_INFO[row.type as RowType];
              const { pattern, setPattern } = isEffect
                ? getEffectPatternForType(row.type as EffectRowType)
                : getPatternForType(row.type as RowType);
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
                    subdivision={isEffect ? 1 : subdivisions[row.type as RowType]}
                    patternLength={isEffect ? 16 : patternLengths[row.type as RowType]}
                    onCycleSubdivision={isEffect ? undefined : () =>
                      cycleSubdivision(row.type as RowType, pattern, setPattern)
                    }
                    onCyclePatternLength={isEffect ? undefined : () =>
                      cyclePatternLength(row.type as RowType, pattern, setPattern)
                    }
                    formatSubdivision={formatSubdivision}
                    channelStates={channelStates}
                    toggleMute={toggleMute}
                    toggleSolo={toggleSolo}
                    isChannelActive={isChannelActive}
                    handleMouseDown={handleMouseDown}
                    handleMouseEnter={handleMouseEnter}
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
                <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-10 min-w-[200px] max-h-80 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider border-b border-gray-700">
                    Instrument Rows
                  </div>
                  {(Object.keys(ROW_TYPE_INFO) as RowType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => addRow(type)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span
                        className={ROW_TYPE_INFO[type].hitColor
                          .split(" ")[0]
                          .replace("bg-", "text-")}
                      >
                        {ROW_TYPE_INFO[type].hitSymbol}
                      </span>
                      <span>{ROW_TYPE_INFO[type].label}</span>
                      <span className="text-gray-500 ml-auto">
                        {ROW_TYPE_INFO[type].description}
                      </span>
                    </button>
                  ))}
                  <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider border-t border-b border-gray-700 mt-1">
                    Effect Rows
                  </div>
                  {(Object.keys(EFFECT_ROW_TYPE_INFO) as EffectRowType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => addEffectRow(type)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span
                        className={EFFECT_ROW_TYPE_INFO[type].hitColor
                          .split(" ")[0]
                          .replace("bg-", "text-")}
                      >
                        {EFFECT_ROW_TYPE_INFO[type].hitSymbol}
                      </span>
                      <span>{EFFECT_ROW_TYPE_INFO[type].label}</span>
                      <span className="text-gray-500 ml-auto">
                        {EFFECT_ROW_TYPE_INFO[type].description}
                      </span>
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
            <span>
              <span className="text-red-500">M</span>=Mute{" "}
              <span className="text-yellow-500">S</span>=Solo
            </span>
            <span>
              <span className="text-purple-400">¼×-4×</span>=Subdiv
            </span>
            <span>
              <span className="text-gray-400">4-64</span>=Length
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

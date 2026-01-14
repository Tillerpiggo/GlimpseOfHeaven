/**
 * ControlsPanel component for visualization settings
 */

export type ControlsPanelProps = {
  // Visualization settings
  orbitRadius: number;
  setOrbitRadius: (v: number) => void;
  bpm: number;
  setBpm: (v: number) => void;
  circleRadius: number;
  setCircleRadius: (v: number) => void;
  numCircles: number;
  setNumCircles: (v: number) => void;
  circleSpacing: number;
  setCircleSpacing: (v: number) => void;
  dotSize: number;
  setDotSize: (v: number) => void;
  growthRate: number;
  setGrowthRate: (v: number) => void;
  tiltAmount: number;
  setTiltAmount: (v: number) => void;
  // Layout
  width: number;
  visible: boolean;
  setVisible: (v: boolean) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  // Current pattern info
  currentPatternName?: string;
};

export function ControlsPanel({
  orbitRadius,
  setOrbitRadius,
  bpm,
  setBpm,
  circleRadius,
  setCircleRadius,
  numCircles,
  setNumCircles,
  circleSpacing,
  setCircleSpacing,
  dotSize,
  setDotSize,
  growthRate,
  setGrowthRate,
  tiltAmount,
  setTiltAmount,
  width,
  visible,
  setVisible,
  onResizeStart,
  currentPatternName,
}: ControlsPanelProps) {
  return (
    <div
      className="bg-black/30 border-r border-gray-800 overflow-y-auto p-4 space-y-4 relative flex-shrink-0"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-cyan-500/50 transition-colors"
        onMouseDown={onResizeStart}
      />
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Controls</h2>
          <button
            onClick={() => setVisible(!visible)}
            className="text-gray-400 hover:text-white text-sm"
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
        {currentPatternName && (
          <div className="text-xs text-cyan-400">
            Editing: {currentPatternName}
          </div>
        )}
      </div>

      {visible && (
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
  );
}

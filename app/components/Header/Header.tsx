/**
 * Header component with playback controls and audio management
 */

export type HeaderProps = {
  rhythmName: string;
  setRhythmName: (name: string) => void;
  bpm: number;
  audioUrl: string | null;
  audioFileName: string;
  isPlaying: boolean;
  syncOffset: number;
  setSyncOffset: (offset: number) => void;
  onBack: () => void;
  onSave: () => void;
  onToggleFullscreen: () => void;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePlayPause: () => void;
  onStop: () => void;
  onSetSyncFromCurrentPosition: () => void;
};

export function Header({
  rhythmName,
  setRhythmName,
  bpm,
  audioUrl,
  audioFileName,
  isPlaying,
  syncOffset,
  setSyncOffset,
  onBack,
  onSave,
  onToggleFullscreen,
  onAudioUpload,
  onTogglePlayPause,
  onStop,
  onSetSyncFromCurrentPosition,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-black/50 border-b border-gray-800">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white">
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
            onChange={onAudioUpload}
            className="hidden"
          />
        </label>
        {audioUrl && (
          <>
            <button
              onClick={onTogglePlayPause}
              className={`px-4 py-1.5 rounded text-sm font-medium ${
                isPlaying
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-green-600 hover:bg-green-500"
              }`}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button
              onClick={onStop}
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
                onClick={onSetSyncFromCurrentPosition}
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
          onClick={onSave}
          className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-sm font-medium"
        >
          Save
        </button>
        <button
          onClick={onToggleFullscreen}
          className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          Fullscreen
        </button>
      </div>
    </div>
  );
}

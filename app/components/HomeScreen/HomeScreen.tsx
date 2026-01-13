/**
 * HomeScreen component for the landing page
 */

import type { RhythmData } from "@/types";
import { DEFAULT_BEATS } from "@/constants";

export type HomeScreenProps = {
  savedRhythms: RhythmData[];
  onCreateNew: () => void;
  onLoadRhythm: (rhythm: RhythmData) => void;
  onDeleteRhythm: (id: string) => void;
  onLoadDefaultBeat: (beat: Omit<RhythmData, "id" | "createdAt">) => void;
};

export function HomeScreen({
  savedRhythms,
  onCreateNew,
  onLoadRhythm,
  onDeleteRhythm,
  onLoadDefaultBeat,
}: HomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Orbital Circles</h1>
        <p className="text-gray-400 mb-8">
          Create hypnotic orbital visualizations with programmable rhythms
        </p>

        <button
          onClick={onCreateNew}
          className="mb-8 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold transition-colors"
        >
          + Create New Rhythm
        </button>

        {savedRhythms.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Rhythms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedRhythms.map((rhythm) => (
                <div
                  key={rhythm.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-cyan-500 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{rhythm.name}</h3>
                      <p className="text-sm text-gray-400">{rhythm.bpm} BPM</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onLoadRhythm(rhythm)}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-sm"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => onDeleteRhythm(rhythm.id)}
                        className="px-3 py-1 bg-red-600/50 hover:bg-red-500 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-4">Preset Beats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEFAULT_BEATS.map((beat, i) => (
              <button
                key={i}
                onClick={() => onLoadDefaultBeat(beat)}
                className="bg-gradient-to-br from-purple-900/50 to-cyan-900/50 border border-purple-500/30 rounded-lg p-4 text-left hover:border-purple-400 transition-colors"
              >
                <h3 className="font-semibold">{beat.name}</h3>
                <p className="text-sm text-gray-400">{beat.bpm} BPM</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

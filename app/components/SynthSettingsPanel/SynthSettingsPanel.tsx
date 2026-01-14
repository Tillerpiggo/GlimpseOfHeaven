/**
 * Synth Settings Panel - UI for configuring synth visual settings
 * Modern side panel design with vertical scrolling
 */

import { useState, useMemo } from "react";
import type { UseSynthSettingsReturn } from "@/hooks";
import { COLOR_SCHEMES } from "@/types";

export type SynthSettingsPanelProps = {
  synthSettings: UseSynthSettingsReturn;
  expanded?: boolean;
  setExpanded?: (v: boolean) => void;
};

/**
 * Color swatch component for color scheme selection
 */
function ColorSwatch({
  scheme,
  isSelected,
  onClick,
}: {
  scheme: { name: string; primary: string; secondary: string; background: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative w-10 h-10 rounded-lg overflow-hidden transition-all
        ${isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-gray-900 scale-105" : "hover:scale-105 opacity-80 hover:opacity-100"}
      `}
      title={scheme.name}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: scheme.background }}
      />
      <div
        className="absolute inset-1 rounded"
        style={{
          background: `linear-gradient(135deg, ${scheme.primary} 0%, ${scheme.secondary} 100%)`,
        }}
      />
    </button>
  );
}

/**
 * Section header component
 */
function SectionHeader({
  title,
  isOpen,
  onClick,
}: {
  title: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center justify-between w-full py-2 text-left group"
      onClick={onClick}
    >
      <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider group-hover:text-white transition-colors">
        {title}
      </span>
      <span className={`text-gray-500 text-sm transition-transform ${isOpen ? "rotate-180" : ""}`}>
        ▾
      </span>
    </button>
  );
}

/**
 * Slider component with label and value
 */
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs text-gray-300 font-mono">
          {formatValue ? formatValue(value) : value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 accent-cyan-500 bg-gray-700 rounded cursor-pointer"
      />
    </div>
  );
}

/**
 * Toggle button component
 */
function ToggleButton({
  label,
  enabled,
  onClick,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-xs font-medium rounded-md transition-all
        ${enabled
          ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20"
          : "bg-gray-700/50 text-gray-400 hover:bg-gray-600/50"
        }
      `}
    >
      {label}
    </button>
  );
}

/**
 * Pill button group for selecting options
 */
function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`
            px-2 py-1 text-xs rounded-md capitalize transition-all
            ${value === opt
              ? "bg-cyan-600 text-white"
              : "bg-gray-700/50 text-gray-400 hover:bg-gray-600/50"
            }
          `}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function SynthSettingsPanel({
  synthSettings,
  expanded = true,
  setExpanded,
}: SynthSettingsPanelProps) {
  const {
    colorScheme,
    setColorScheme,
    colorSchemeNames,
    polarMode,
    setPolarMode,
    petalConfig,
    setPetalCount,
    setPetalOpenness,
    setPetalRotation,
    polarOscillator,
    setOscillatorEnabled,
    setOscillatorTargets,
    setOscillatorSpeed,
    setOscillatorEasing,
    orbitOscillator,
    setOrbitOscillatorEnabled,
    setOrbitOscillatorAmount,
    setOrbitOscillatorMinRadius,
    setOrbitOscillatorMaxRadius,
    setOrbitOscillatorDivision,
    setOrbitOscillatorPhaseOffset,
    setOrbitOscillatorWaveform,
    lineWidth,
    setLineWidth,
    lineSoftness,
    setLineSoftness,
    rotationAmount,
    setRotationAmount,
    reset,
  } = synthSettings;

  // Track which sections are expanded
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["colors", "orbit"])
  );

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Color schemes organized for display
  const schemesList = useMemo(
    () =>
      colorSchemeNames.map((schemeName) => ({
        ...COLOR_SCHEMES[schemeName],
        name: schemeName,
      })),
    [colorSchemeNames]
  );

  // Toggle oscillator target
  const toggleOscillatorTarget = (count: number) => {
    const current = polarOscillator.targets;
    if (current.includes(count)) {
      if (current.length > 1) {
        setOscillatorTargets(current.filter((t) => t !== count));
      }
    } else {
      setOscillatorTargets([...current, count].sort((a, b) => a - b));
    }
  };

  // Division options for tempo sync
  const divisionLabels: Record<number, string> = {
    1: "1 bar",
    2: "1/2",
    4: "1/4",
    8: "1/8",
    16: "1/16",
  };

  if (!expanded) {
    return (
      <div className="flex flex-col w-10 h-full bg-black/95 border-l border-gray-800/50">
        <button
          onClick={() => setExpanded?.(true)}
          className="flex flex-col items-center gap-2 px-2 py-4 hover:bg-gray-800/50 transition-colors"
        >
          <span className="text-gray-500 text-xs">←</span>
          <div
            className="w-5 h-5 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${colorScheme.primary} 0%, ${colorScheme.secondary} 100%)`,
            }}
          />
          <span className="text-xs text-gray-400 [writing-mode:vertical-lr]">Settings</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-64 h-full bg-black/95 backdrop-blur-xl border-l border-gray-800/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <h3 className="text-sm font-semibold text-white">Visual Settings</h3>
        <button
          onClick={() => setExpanded?.(false)}
          className="text-gray-500 hover:text-white transition-colors text-lg"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Color Scheme Section */}
        <div className="space-y-2">
          <SectionHeader
            title="Color Scheme"
            isOpen={openSections.has("colors")}
            onClick={() => toggleSection("colors")}
          />
          {openSections.has("colors") && (
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {schemesList.map((scheme) => (
                <ColorSwatch
                  key={scheme.name}
                  scheme={scheme}
                  isSelected={colorScheme.name === scheme.name}
                  onClick={() => setColorScheme(scheme.name)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Orbit Oscillator Section */}
        <div className="space-y-2">
          <SectionHeader
            title="Orbit Distance"
            isOpen={openSections.has("orbit")}
            onClick={() => toggleSection("orbit")}
          />
          {openSections.has("orbit") && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Oscillator</span>
                <ToggleButton
                  label={orbitOscillator.enabled ? "ON" : "OFF"}
                  enabled={orbitOscillator.enabled}
                  onClick={() => setOrbitOscillatorEnabled(!orbitOscillator.enabled)}
                />
              </div>

              {orbitOscillator.enabled && (
                <div className="space-y-3 p-3 bg-gray-900/50 rounded-lg">
                  <Slider
                    label="Amount"
                    value={orbitOscillator.amount}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={setOrbitOscillatorAmount}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Slider
                      label="Min"
                      value={orbitOscillator.minRadius}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={setOrbitOscillatorMinRadius}
                      formatValue={(v) => `${Math.round(v * 100)}%`}
                    />
                    <Slider
                      label="Max"
                      value={orbitOscillator.maxRadius}
                      min={1}
                      max={2}
                      step={0.05}
                      onChange={setOrbitOscillatorMaxRadius}
                      formatValue={(v) => `${Math.round(v * 100)}%`}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-gray-400">Tempo Sync</span>
                    <div className="flex gap-1">
                      {[1, 2, 4, 8, 16].map((div) => (
                        <button
                          key={div}
                          onClick={() => setOrbitOscillatorDivision(div)}
                          className={`
                            flex-1 px-1 py-1.5 text-xs rounded transition-all
                            ${orbitOscillator.division === div
                              ? "bg-cyan-600 text-white"
                              : "bg-gray-700/50 text-gray-400 hover:bg-gray-600/50"
                            }
                          `}
                        >
                          {divisionLabels[div]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Slider
                    label="Phase Offset"
                    value={orbitOscillator.phaseOffset}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={setOrbitOscillatorPhaseOffset}
                    formatValue={(v) => `${Math.round(v * 360)}°`}
                  />

                  <div className="space-y-1">
                    <span className="text-xs text-gray-400">Waveform</span>
                    <PillGroup
                      options={["sine", "triangle", "square", "sawtooth"] as const}
                      value={orbitOscillator.waveform}
                      onChange={setOrbitOscillatorWaveform}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shape Mode Section */}
        <div className="space-y-2">
          <SectionHeader
            title="Shape Mode"
            isOpen={openSections.has("shape")}
            onClick={() => toggleSection("shape")}
          />
          {openSections.has("shape") && (
            <div className="space-y-3 pt-1">
              <div className="flex gap-2">
                <ToggleButton
                  label="Circle"
                  enabled={polarMode === "circle"}
                  onClick={() => setPolarMode("circle")}
                />
                <ToggleButton
                  label="Rose / Petals"
                  enabled={polarMode === "rose"}
                  onClick={() => setPolarMode("rose")}
                />
              </div>

              {polarMode === "rose" && (
                <div className="space-y-3 p-3 bg-gray-900/50 rounded-lg">
                  <Slider
                    label="Petals"
                    value={petalConfig.petalCount}
                    min={1}
                    max={8}
                    step={0.5}
                    onChange={setPetalCount}
                    formatValue={(v) => v.toFixed(1)}
                  />

                  <Slider
                    label="Openness"
                    value={petalConfig.openness}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={setPetalOpenness}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                  />

                  <Slider
                    label="Rotation"
                    value={petalConfig.rotation}
                    min={0}
                    max={Math.PI * 2}
                    step={0.1}
                    onChange={setPetalRotation}
                    formatValue={(v) => `${Math.round((v * 180) / Math.PI)}°`}
                  />

                  {/* Polar Oscillator */}
                  <div className="pt-2 border-t border-gray-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Petal Oscillator</span>
                      <ToggleButton
                        label={polarOscillator.enabled ? "ON" : "OFF"}
                        enabled={polarOscillator.enabled}
                        onClick={() => setOscillatorEnabled(!polarOscillator.enabled)}
                      />
                    </div>

                    {polarOscillator.enabled && (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500">Targets</span>
                          <div className="flex gap-1 flex-wrap">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                              <button
                                key={count}
                                onClick={() => toggleOscillatorTarget(count)}
                                className={`
                                  w-7 h-7 rounded-full text-xs font-medium transition-all
                                  ${polarOscillator.targets.includes(count)
                                    ? "bg-cyan-600 text-white"
                                    : "bg-gray-700/50 text-gray-400 hover:bg-gray-600/50"
                                  }
                                `}
                              >
                                {count}
                              </button>
                            ))}
                          </div>
                        </div>

                        <Slider
                          label="Speed"
                          value={polarOscillator.speed}
                          min={0.05}
                          max={1}
                          step={0.05}
                          onChange={setOscillatorSpeed}
                          formatValue={(v) => `${v.toFixed(2)}x`}
                        />

                        <PillGroup
                          options={["sine", "linear", "bounce"] as const}
                          value={polarOscillator.easing}
                          onChange={setOscillatorEasing}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Line Style Section */}
        <div className="space-y-2">
          <SectionHeader
            title="Line Style"
            isOpen={openSections.has("style")}
            onClick={() => toggleSection("style")}
          />
          {openSections.has("style") && (
            <div className="space-y-3 pt-1">
              <Slider
                label="Line Width"
                value={lineWidth}
                min={1}
                max={5}
                step={0.5}
                onChange={setLineWidth}
                formatValue={(v) => `${v}px`}
              />

              <Slider
                label="Glow"
                value={lineSoftness}
                min={0}
                max={1}
                step={0.05}
                onChange={setLineSoftness}
                formatValue={(v) => `${Math.round(v * 100)}%`}
              />

              <Slider
                label="Rotation Amount"
                value={rotationAmount}
                min={0}
                max={2}
                step={0.1}
                onChange={setRotationAmount}
                formatValue={(v) => `${Math.round(v * 100)}%`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800/50">
        <button
          onClick={reset}
          className="w-full px-3 py-2 text-xs bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white rounded-lg transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

/**
 * Hook for managing channel mute/solo states
 */

import { useState, useCallback, useMemo } from "react";
import type { ChannelState } from "@/types";
import { DEFAULT_CHANNEL_STATES } from "@/constants";

export type ChannelStateReturn = {
  channelStates: Record<string, ChannelState>;
  setChannelStates: (states: Record<string, ChannelState>) => void;
  anySoloed: boolean;
  isChannelActive: (channel: string) => boolean;
  toggleMute: (channel: string) => void;
  toggleSolo: (channel: string) => void;
  resetChannelStates: () => void;
};

export function useChannelState(): ChannelStateReturn {
  const [channelStates, setChannelStates] = useState<Record<string, ChannelState>>({
    ...DEFAULT_CHANNEL_STATES,
  });

  const anySoloed = useMemo(
    () => Object.values(channelStates).some((s) => s.solo),
    [channelStates]
  );

  const isChannelActive = useCallback(
    (channel: string): boolean => {
      const state = channelStates[channel];
      if (!state) return true;
      if (state.mute && !state.solo) return false;
      if (anySoloed && !state.solo) return false;
      return true;
    },
    [channelStates, anySoloed]
  );

  const toggleMute = useCallback((channel: string) => {
    setChannelStates((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], mute: !prev[channel].mute },
    }));
  }, []);

  const toggleSolo = useCallback((channel: string) => {
    setChannelStates((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], solo: !prev[channel].solo },
    }));
  }, []);

  const resetChannelStates = useCallback(() => {
    setChannelStates({ ...DEFAULT_CHANNEL_STATES });
  }, []);

  return {
    channelStates,
    setChannelStates,
    anySoloed,
    isChannelActive,
    toggleMute,
    toggleSolo,
    resetChannelStates,
  };
}

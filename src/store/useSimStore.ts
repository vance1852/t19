import { create } from "zustand";
import type {
  SimParams,
  MetricsSnapshot,
  WaveStrategy,
  CompareResult,
} from "@/simulation/types";
import {
  createSimulation,
  stepSimulation,
  DEFAULT_PARAMS,
  type SimState,
  runHeadless,
} from "@/simulation/engine";

type Speed = 1 | 2 | 4 | 8;

interface UIState {
  params: SimParams;
  simState: SimState;
  playing: boolean;
  speed: Speed;
  latestMetrics: MetricsSnapshot | null;
  compareResults: CompareResult[];
  compareRunning: boolean;
  compareProgress: Record<WaveStrategy, number>;
  setParams: (p: Partial<SimParams>) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: Speed) => void;
  doStep: () => void;
  reset: () => void;
  runCompare: (
    strategies: WaveStrategy[],
    durationSec: number,
  ) => Promise<void>;
}

export const useSimStore = create<UIState>((set, get) => ({
  params: { ...DEFAULT_PARAMS },
  simState: createSimulation(DEFAULT_PARAMS),
  playing: false,
  speed: 1,
  latestMetrics: null,
  compareResults: [],
  compareRunning: false,
  compareProgress: { time: 0, location: 0, basket: 0 },

  setParams: (p) => {
    const params = { ...get().params, ...p };
    set({ params });
  },

  setPlaying: (p) => set({ playing: p }),

  setSpeed: (s) => set({ speed: s }),

  doStep: () => {
    const { simState, params } = get();
    stepSimulation(simState, params);
    const snap =
      simState.metricsHistory[simState.metricsHistory.length - 1] || null;
    set({ simState: { ...simState }, latestMetrics: snap });
  },

  reset: () => {
    const params = get().params;
    const simState = createSimulation(params);
    set({ simState, playing: false, latestMetrics: null });
  },

  runCompare: async (strategies, durationSec) => {
    set({
      compareRunning: true,
      compareResults: [],
      compareProgress: { time: 0, location: 0, basket: 0 },
    });
    const results: CompareResult[] = [];
    const baseParams = get().params;

    const runOne = async (strategy: WaveStrategy) => {
      const params: SimParams = { ...baseParams, waveStrategy: strategy };
      const onProgress = (pct: number) => {
        set((state) => ({
          compareProgress: { ...state.compareProgress, [strategy]: pct },
        }));
      };
      await new Promise((r) => setTimeout(r, 10));
      const result = runHeadless(params, durationSec, onProgress);
      set((state) => ({
        compareProgress: { ...state.compareProgress, [strategy]: 1 },
      }));
      return result;
    };

    for (const s of strategies) {
      results.push(await runOne(s));
    }

    set({ compareResults: results, compareRunning: false });
  },
}));

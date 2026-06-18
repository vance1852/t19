import { useState } from "react";
import { useSimStore } from "@/store/useSimStore";
import CompareTable from "@/components/CompareTable";
import type { WaveStrategy } from "@/simulation/types";

const STRATEGY_LABELS: Record<WaveStrategy, string> = {
  time: "时间分批",
  location: "库位聚类",
  basket: "篮子聚类",
};

export default function ComparePage() {
  const compareResults = useSimStore((s) => s.compareResults);
  const compareRunning = useSimStore((s) => s.compareRunning);
  const compareProgress = useSimStore((s) => s.compareProgress);
  const runCompare = useSimStore((s) => s.runCompare);

  const [durationSec, setDurationSec] = useState(600);
  const [strategies, setStrategies] = useState<WaveStrategy[]>([
    "time",
    "location",
    "basket",
  ]);

  const toggleStrategy = (s: WaveStrategy) => {
    setStrategies((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const handleStart = () => {
    if (strategies.length === 0 || compareRunning) return;
    runCompare(strategies, durationSec);
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <h1 className="text-xl font-semibold mb-6">波次策略对比报告</h1>

        <div className="bg-base-900/60 border border-base-800 rounded-lg p-5 mb-6 space-y-5">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400 whitespace-nowrap">
                仿真时长
              </label>
              <input
                type="range"
                min={60}
                max={1800}
                step={60}
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                disabled={compareRunning}
                className="w-56"
              />
              <span className="text-sm font-mono text-accent-cyan w-20">
                {durationSec}s
              </span>
            </div>

            <div className="flex items-center gap-4">
              {(["time", "location", "basket"] as WaveStrategy[]).map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 text-sm cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={strategies.includes(s)}
                    onChange={() => toggleStrategy(s)}
                    disabled={compareRunning}
                    className="w-4 h-4 accent-accent-cyan"
                  />
                  {STRATEGY_LABELS[s]}
                </label>
              ))}
            </div>

            <button
              onClick={handleStart}
              disabled={compareRunning || strategies.length === 0}
              className="ml-auto px-4 py-2 rounded bg-accent-cyan text-base-950 text-sm font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            >
              {compareRunning ? "对比中..." : "开始对比"}
            </button>
          </div>

          {compareRunning && (
            <div className="space-y-2 pt-2 border-t border-base-800">
              {strategies.map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <span className="text-sm text-slate-400 w-20">
                    {STRATEGY_LABELS[s]}
                  </span>
                  <div className="flex-1 h-2 bg-base-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-accent-cyan transition-all duration-200"
                      style={{
                        width: `${Math.round(compareProgress[s] * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-mono text-slate-400 w-12 text-right">
                    {Math.round(compareProgress[s] * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {compareResults.length > 0 && <CompareTable results={compareResults} />}
      </div>
    </div>
  );
}

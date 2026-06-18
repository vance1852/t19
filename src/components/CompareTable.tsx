import type { CompareResult, WaveStrategy } from "@/simulation/types";
import { cn } from "@/lib/utils";

const STRATEGY_LABELS: Record<WaveStrategy, string> = {
  time: "时间分批",
  location: "库位聚类",
  basket: "篮子聚类",
};

interface MetricDef {
  key: keyof CompareResult;
  label: string;
  lowerBetter: boolean;
  format: (v: number) => string;
  unit?: string;
}

const METRICS: MetricDef[] = [
  {
    key: "avgFulfillment",
    label: "平均履行时长",
    lowerBetter: true,
    format: (v) => v.toFixed(1),
    unit: "s",
  },
  {
    key: "totalDistance",
    label: "总距离",
    lowerBetter: true,
    format: (v) => v.toFixed(0),
    unit: "m",
  },
  {
    key: "throughputPerHour",
    label: "吞吐量",
    lowerBetter: false,
    format: (v) => v.toFixed(1),
    unit: "/h",
  },
  {
    key: "coldAvgExposure",
    label: "冷藏暴露",
    lowerBetter: true,
    format: (v) => v.toFixed(1),
    unit: "s",
  },
  {
    key: "packingUtilization",
    label: "打包台利用率",
    lowerBetter: false,
    format: (v) => (v * 100).toFixed(1),
    unit: "%",
  },
  {
    key: "maxCongestion",
    label: "最大拥堵",
    lowerBetter: true,
    format: (v) => v.toFixed(2),
  },
];

function getBestValue(
  results: CompareResult[],
  key: keyof CompareResult,
): number {
  const metric = METRICS.find((m) => m.key === key)!;
  const values = results.map((r) => r[key] as number);
  return metric.lowerBetter ? Math.min(...values) : Math.max(...values);
}

function getDeltaPct(
  value: number,
  best: number,
  lowerBetter: boolean,
): number {
  if (best === 0) return 0;
  if (lowerBetter) {
    return ((value - best) / best) * 100;
  } else {
    return ((best - value) / best) * 100;
  }
}

export default function CompareTable({
  results,
}: {
  results: CompareResult[];
}) {
  const bestByMetric: Record<string, number> = {};
  METRICS.forEach((m) => {
    bestByMetric[m.key] = getBestValue(results, m.key);
  });

  return (
    <div className="bg-base-900/60 border border-base-800 rounded-lg overflow-hidden">
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-base-900 z-10">
            <tr className="text-slate-400 border-b border-base-800">
              <th className="text-left font-medium px-4 py-3">策略</th>
              {METRICS.map((m) => (
                <th
                  key={m.key}
                  className="text-right font-medium px-4 py-3 whitespace-nowrap"
                >
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => (
              <tr
                key={r.strategy}
                className={cn(
                  "border-b border-base-800/60 last:border-b-0",
                  idx % 2 === 1 ? "bg-base-950/30" : "",
                )}
              >
                <td className="px-4 py-3 font-medium">
                  {STRATEGY_LABELS[r.strategy]}
                </td>
                {METRICS.map((m) => {
                  const value = r[m.key] as number;
                  const best = bestByMetric[m.key];
                  const isBest = value === best;
                  const delta = getDeltaPct(value, best, m.lowerBetter);

                  return (
                    <td
                      key={m.key}
                      className={cn(
                        "px-4 py-3 text-right whitespace-nowrap font-mono-tabular",
                        isBest &&
                          "bg-emerald-900/30 text-emerald-300 font-semibold",
                      )}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>
                          {m.format(value)}
                          {m.unit}
                        </span>
                        {!isBest && delta > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 font-normal">
                            +{delta.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

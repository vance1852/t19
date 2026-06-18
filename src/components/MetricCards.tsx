import { useSimStore } from "@/store/useSimStore";
import { cn } from "@/lib/utils";

function formatFulfillment(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(1) + " km";
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + "%";
}

function getMaxCongestion(arr: number[]): number {
  return arr.length > 0 ? Math.max(...arr) : 0;
}

interface CardProps {
  value: string;
  label: string;
  color?: "cyan" | "amber" | "pink";
}

function MetricCard({ value, label, color = "cyan" }: CardProps) {
  const colorClasses = {
    cyan: "text-accent-cyan",
    amber: "text-accent-amber",
    pink: "text-accent-pink",
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg bg-base-900 border border-base-800 px-4 py-3",
        "transition-colors duration-300 hover:border-base-700 hover:bg-[#131c33]"
      )}
    >
      <div
        className={cn(
          "font-mono text-2xl tabular-nums transition-all duration-300",
          colorClasses[color]
        )}
      >
        {value}
      </div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

export default function MetricCards() {
  const latestMetrics = useSimStore((s) => s.latestMetrics);

  const avgFulfillment = latestMetrics?.avgFulfillment ?? 0;
  const totalDistance = latestMetrics?.totalDistance ?? 0;
  const throughputPerHour = latestMetrics?.throughputPerHour ?? 0;
  const coldAvgExposure = latestMetrics?.coldAvgExposure ?? 0;
  const packingUtilization = latestMetrics?.packingUtilization ?? 0;
  const maxCongestion = latestMetrics ? getMaxCongestion(latestMetrics.aisleCongestion) : 0;

  const coldColor: "cyan" | "pink" = coldAvgExposure > 180 ? "pink" : "cyan";
  const packingColor: "cyan" | "amber" = packingUtilization > 0.85 ? "amber" : "cyan";

  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard
        value={formatFulfillment(avgFulfillment)}
        label="平均订单履行时长"
      />
      <MetricCard
        value={formatDistance(totalDistance)}
        label="总行走距离"
      />
      <MetricCard
        value={throughputPerHour.toFixed(1) + " 单/小时"}
        label="单位时间出货量"
      />
      <MetricCard
        value={Math.floor(coldAvgExposure) + " s"}
        label="冷藏品平均暴露"
        color={coldColor}
      />
      <MetricCard
        value={formatPercent(packingUtilization)}
        label="打包台利用率"
        color={packingColor}
      />
      <MetricCard
        value={String(maxCongestion)}
        label="最大通道拥堵"
      />
    </div>
  );
}

import { Play, Pause, StepForward, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSimStore } from "@/store/useSimStore";
import type { WaveStrategy } from "@/simulation/types";
import Slider from "./Slider";

const SPEEDS = [1, 2, 4, 8] as const;

const STRATEGY_LABELS: Record<WaveStrategy, string> = {
  time: "时间分批",
  location: "库位聚类",
  basket: "篮子聚类",
};

export default function ControlBar() {
  const {
    params,
    setParams,
    playing,
    setPlaying,
    speed,
    setSpeed,
    doStep,
    reset,
  } = useSimStore();

  return (
    <div className="flex h-full w-full flex-col bg-base-900 text-slate-200">
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold border-b border-base-800 pb-2">
          控制
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <section className="py-3 border-b border-base-800/60">
          <div className="mb-2 text-xs text-slate-400">时间控制</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying(!playing)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
                playing
                  ? "border-accent-amber/50 bg-accent-amber/10 text-accent-amber"
                  : "border-base-700 bg-base-800 text-slate-300 hover:border-accent-cyan/50 hover:text-accent-cyan"
              )}
              title={playing ? "暂停" : "播放"}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={doStep}
              disabled={playing}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
                "border-base-700 bg-base-800 text-slate-300",
                !playing && "hover:border-accent-cyan/50 hover:text-accent-cyan",
                playing && "opacity-40 cursor-not-allowed"
              )}
              title="单步执行"
            >
              <StepForward size={16} />
            </button>
            <button
              onClick={reset}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-base-700 bg-base-800 text-slate-300 transition-colors hover:border-accent-cyan/50 hover:text-accent-cyan"
              title="重置"
            >
              <RotateCcw size={16} />
            </button>
            <div className="ml-auto flex items-center gap-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "h-7 px-2 text-xs font-mono rounded border transition-colors",
                    speed === s
                      ? "border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan"
                      : "border-base-700 bg-base-800 text-slate-400 hover:border-base-600 hover:text-slate-300"
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="py-3 border-b border-base-800/60">
          <div className="mb-2 text-xs text-slate-400">波次策略</div>
          <select
            value={params.waveStrategy}
            onChange={(e) =>
              setParams({ waveStrategy: e.target.value as WaveStrategy })
            }
            className="w-full h-9 rounded-md border border-base-700 bg-base-800 px-3 text-sm text-slate-200 outline-none transition-colors focus:border-accent-cyan/60"
          >
            {(Object.keys(STRATEGY_LABELS) as WaveStrategy[]).map((key) => (
              <option key={key} value={key}>
                {STRATEGY_LABELS[key]}
              </option>
            ))}
          </select>
        </section>

        <section className="py-3 border-b border-base-800/60">
          <div className="mb-3 text-xs text-slate-400">参数设置</div>
          <div className="space-y-3">
            <Slider
              label="拣货员数量"
              value={params.pickerCount}
              min={1}
              max={10}
              step={1}
              onChange={(v) => setParams({ pickerCount: v })}
              unit="人"
            />
            <Slider
              label="复核台数量"
              value={params.packingStationCount}
              min={1}
              max={6}
              step={1}
              onChange={(v) => setParams({ packingStationCount: v })}
              unit="台"
            />
            <Slider
              label="订单到达率"
              value={params.orderArrivalPerHour}
              min={30}
              max={300}
              step={10}
              onChange={(v) => setParams({ orderArrivalPerHour: v })}
              unit="单/时"
            />
            <Slider
              label="冷藏商品比例"
              value={params.coldRatio}
              min={0}
              max={100}
              step={1}
              onChange={(v) => setParams({ coldRatio: v })}
              unit="%"
            />
            {params.waveStrategy === "time" && (
              <Slider
                label="时间分批窗口"
                value={params.timeBatchWindow}
                min={30}
                max={600}
                step={10}
                onChange={(v) => setParams({ timeBatchWindow: v })}
                unit="s"
              />
            )}
            <Slider
              label="单波最大订单"
              value={params.maxOrdersPerWave}
              min={2}
              max={20}
              step={1}
              onChange={(v) => setParams({ maxOrdersPerWave: v })}
              unit="单"
            />
            <Slider
              label="每件拣货耗时"
              value={params.pickingTimePerItem}
              min={1}
              max={10}
              step={0.5}
              onChange={(v) => setParams({ pickingTimePerItem: v })}
              unit="s"
            />
            <Slider
              label="每单复核耗时"
              value={params.packingTimePerOrder}
              min={10}
              max={120}
              step={5}
              onChange={(v) => setParams({ packingTimePerOrder: v })}
              unit="s"
            />
            <Slider
              label="基础速度"
              value={params.baseSpeed}
              min={0.5}
              max={3}
              step={0.1}
              onChange={(v) => setParams({ baseSpeed: v })}
              unit="m/s"
            />
          </div>
        </section>

        <section className="py-3">
          <div className="text-xs text-slate-500 leading-relaxed">
            暂停时可单步执行，修改拣货员数量 / 复核台数量需重置后生效。
          </div>
        </section>
      </div>
    </div>
  );
}

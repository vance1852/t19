import { useEffect } from "react";
import { useSimStore } from "@/store/useSimStore";
import MetricCards from "@/components/MetricCards";
import TrendChart from "@/components/TrendChart";
import WarehouseCanvas from "@/components/WarehouseCanvas";
import ControlBar from "@/components/ControlBar";

export default function SimulationPage() {
  const playing = useSimStore((s) => s.playing);
  const speed = useSimStore((s) => s.speed);
  const doStep = useSimStore((s) => s.doStep);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      for (let i = 0; i < speed; i++) {
        doStep();
      }
    }, 33);
    return () => clearInterval(id);
  }, [playing, speed, doStep]);

  return (
    <div className="w-full h-full flex">
      <div className="w-72 shrink-0 bg-base-900/60 border-r border-base-800 overflow-y-auto flex flex-col">
        <MetricCards />
        <div className="flex-1 min-h-0">
          <TrendChart />
        </div>
      </div>
      <div className="flex-1 bg-base-950 relative">
        <WarehouseCanvas />
      </div>
      <div className="w-72 shrink-0 bg-base-900/60 border-l border-base-800 overflow-y-auto">
        <ControlBar />
      </div>
    </div>
  );
}

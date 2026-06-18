import { cn } from "@/lib/utils";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
}

export default function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
}: SliderProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-slate-400">{label}</span>
      <input
        type="range"
        className="flex-1 cursor-pointer"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span
        className={cn(
          "w-16 text-right font-mono text-xs text-accent-cyan",
          "tabular-nums"
        )}
      >
        {value}
        {unit && <span className="text-slate-500"> {unit}</span>}
      </span>
    </div>
  );
}

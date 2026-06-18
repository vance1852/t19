import { useEffect, useRef } from "react";
import { useSimStore } from "@/store/useSimStore";
import { setupHiDPICanvas } from "@/utils/canvas";
import type { MetricsSnapshot } from "@/simulation/types";

const WINDOW = 60;
const PAD_TOP = 36;
const PAD_BOTTOM = 28;
const PAD_LEFT = 52;
const PAD_RIGHT = 52;
const CYAN = "#22d3ee";
const AMBER = "#f59e0b";

export default function TrendChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simState = useSimStore((s) => s.simState);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const draw = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w < 10 || h < 10) return;

      const ctx = setupHiDPICanvas(canvas, w, h);
      const history = simState.metricsHistory.slice(-WINDOW);
      const chartW = w - PAD_LEFT - PAD_RIGHT;
      const chartH = h - PAD_TOP - PAD_BOTTOM;

      ctx.clearRect(0, 0, w, h);

      drawLegend(ctx, w);
      drawGrid(ctx, chartW, chartH);

      if (history.length < 2) return;

      const leftMax = Math.max(1, ...history.map((d) => d.throughputPerHour));
      const rightValues = history.map((d) => d.pendingOrders + d.pickingOrders);
      const rightMax = Math.max(1, ...rightValues);

      drawAxes(ctx, chartW, chartH, leftMax, rightMax);
      drawThroughput(ctx, history, chartW, chartH, leftMax);
      drawOrders(ctx, history, rightValues, chartW, chartH, rightMax);
    };

    draw();

    const ro = new ResizeObserver(draw);
    ro.observe(container);
    return () => ro.disconnect();
  }, [simState.metricsHistory]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[240px]">
      <canvas ref={canvasRef} />
    </div>
  );
}

function drawLegend(ctx: CanvasRenderingContext2D, w: number) {
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";

  const items = [
    { color: CYAN, label: "出货量 (单/小时)" },
    { color: AMBER, label: "在拣订单数" },
  ];

  let x = 16;
  for (const item of items) {
    ctx.fillStyle = item.color;
    ctx.fillRect(x, 12, 14, 10);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(item.label, x + 20, 17);
    x += ctx.measureText(item.label).width + 48;
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  chartW: number,
  chartH: number
) {
  ctx.save();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  const rows = 4;
  for (let i = 0; i <= rows; i++) {
    const y = PAD_TOP + (chartH / rows) * i;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(PAD_LEFT + chartW, y);
    ctx.stroke();
  }

  const cols = 5;
  for (let i = 0; i <= cols; i++) {
    const x = PAD_LEFT + (chartW / cols) * i;
    ctx.beginPath();
    ctx.moveTo(x, PAD_TOP);
    ctx.lineTo(x, PAD_TOP + chartH);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  chartW: number,
  chartH: number,
  leftMax: number,
  rightMax: number
) {
  ctx.save();
  ctx.font = "11px JetBrains Mono, ui-monospace, monospace";
  ctx.textBaseline = "middle";

  const rows = 4;
  for (let i = 0; i <= rows; i++) {
    const t = 1 - i / rows;
    const y = PAD_TOP + (chartH / rows) * i;

    const leftVal = (leftMax * t).toFixed(0);
    ctx.fillStyle = CYAN;
    ctx.textAlign = "right";
    ctx.fillText(leftVal, PAD_LEFT - 8, y);

    const rightVal = (rightMax * t).toFixed(0);
    ctx.fillStyle = AMBER;
    ctx.textAlign = "left";
    ctx.fillText(rightVal, PAD_LEFT + chartW + 8, y);
  }

  ctx.restore();
}

function xForIndex(i: number, n: number, chartW: number): number {
  const t = n === 1 ? 0 : i / (n - 1);
  return PAD_LEFT + chartW * t;
}

function yForValue(
  v: number,
  vMax: number,
  chartH: number
): number {
  const t = vMax === 0 ? 0 : v / vMax;
  return PAD_TOP + chartH * (1 - t);
}

function drawThroughput(
  ctx: CanvasRenderingContext2D,
  data: MetricsSnapshot[],
  chartW: number,
  chartH: number,
  leftMax: number
) {
  const n = data.length;
  const baseY = PAD_TOP + chartH;

  ctx.save();

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = xForIndex(i, n, chartW);
    const y = yForValue(data[i].throughputPerHour, leftMax, chartH);
    if (i === 0) ctx.moveTo(x, baseY);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(xForIndex(n - 1, n, chartW), baseY);
  ctx.closePath();

  ctx.fillStyle = CYAN + "1a";
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = xForIndex(i, n, chartW);
    const y = yForValue(data[i].throughputPerHour, leftMax, chartH);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const startTime = data[0].simTime;
  const endTime = data[n - 1].simTime;
  ctx.font = "10px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = "#64748b";
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  const cols = 5;
  for (let i = 0; i <= cols; i++) {
    const t = i / cols;
    const x = PAD_LEFT + chartW * t;
    const timeVal = startTime + (endTime - startTime) * t;
    const rel = Math.max(0, Math.floor(timeVal - data[0].simTime));
    ctx.fillText(rel + "s", x, PAD_TOP + chartH + 8);
  }

  ctx.restore();
}

function drawOrders(
  ctx: CanvasRenderingContext2D,
  data: MetricsSnapshot[],
  values: number[],
  chartW: number,
  chartH: number,
  rightMax: number
) {
  const n = data.length;

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = xForIndex(i, n, chartW);
    const y = yForValue(values[i], rightMax, chartH);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

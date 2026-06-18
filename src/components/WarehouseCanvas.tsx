import { useEffect, useRef } from "react";
import { useSimStore } from "@/store/useSimStore";
import { setupHiDPICanvas, roundRect } from "@/utils/canvas";
import { heatColor, rgbToCss, hexToRgb } from "@/utils/color";
import type {
  Warehouse,
  Picker,
  Aisle,
  Shelf,
  Slot,
  PackingStation,
  PickerStatus,
} from "@/simulation/types";
import type { SimState } from "@/simulation/engine";

const PICKER_COLORS: Record<PickerStatus, string> = {
  idle: "#64748b",
  moving: "#22d3ee",
  picking: "#f59e0b",
  queuing: "#ec4899",
  packing: "#22c55e",
};

const MARGIN = 20;

function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
}

export default function WarehouseCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const simStateRef = useRef<SimState | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, scale: 0 });

  const simState = useSimStore((s) => s.simState);

  useEffect(() => {
    simStateRef.current = simState;
  }, [simState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const state = simStateRef.current;
      if (!state) return;
      const { warehouse } = state;
      const cw = container.clientWidth;
      const ratio = warehouse.width / warehouse.height;
      const ch = cw / ratio;
      const ctx = setupHiDPICanvas(canvas, cw, ch);
      const scale = (cw - MARGIN * 2) / warehouse.width;
      sizeRef.current = { w: cw, h: ch, scale };
      return ctx;
    };

    const render = () => {
      const state = simStateRef.current;
      if (!state) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      const { warehouse, pickers, simTime, orders } = state;
      let ctx = canvas.getContext("2d")!;
      const { w, h, scale } = sizeRef.current;
      if (w === 0) {
        const newCtx = resize();
        if (!newCtx) {
          rafRef.current = requestAnimationFrame(render);
          return;
        }
        ctx = newCtx;
      }
      const s = scale;
      const ox = MARGIN;
      const oy = MARGIN;
      const wx = (x: number) => ox + x * s;
      const wy = (y: number) => oy + y * s;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, w, h);

      drawGrid(ctx, warehouse, wx, wy, s);
      drawColdZone(ctx, warehouse, wx, wy, s);
      drawAisles(ctx, warehouse, wx, wy, s);
      drawShelves(ctx, warehouse, wx, wy, s);
      drawSlots(ctx, warehouse, pickers, wx, wy, s);
      drawStagingAreas(ctx, warehouse, wx, wy, s);
      drawPackingStations(ctx, warehouse, wx, wy, s);
      drawEntrances(ctx, warehouse, wx, wy, s);
      drawPickerPaths(ctx, pickers, wx, wy, s);
      drawPickerTrails(ctx, pickers, wx, wy, s);
      drawPickers(ctx, pickers, wx, wy, s);
      drawHUD(ctx, w, simTime, orders);

      rafRef.current = requestAnimationFrame(render);
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(container);
    resize();
    rafRef.current = requestAnimationFrame(render);

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} className="block w-full" />
    </div>
  );
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  wh: Warehouse,
  wx: (x: number) => number,
  wy: (y: number) => number,
  _s: number,
) {
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = 0; x <= wh.width; x++) {
    ctx.moveTo(wx(x), wy(0));
    ctx.lineTo(wx(x), wy(wh.height));
  }
  for (let y = 0; y <= wh.height; y++) {
    ctx.moveTo(wx(0), wy(y));
    ctx.lineTo(wx(wh.width), wy(y));
  }
  ctx.stroke();
}

function drawColdZone(
  ctx: CanvasRenderingContext2D,
  wh: Warehouse,
  wx: (x: number) => number,
  wy: (y: number) => number,
  _s: number,
) {
  const r = wh.coldZoneRect;
  ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
  ctx.fillRect(wx(r.x), wy(r.y), (r.w) * _s, (r.h) * _s);
  ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(wx(r.x), wy(r.y), (r.w) * _s, (r.h) * _s);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(59, 130, 246, 0.8)";
  ctx.font = "11px sans-serif";
  ctx.fillText("冷藏区", wx(r.x) + 6, wy(r.y) + 14);
}

function drawAisles(
  ctx: CanvasRenderingContext2D,
  wh: Warehouse,
  wx: (x: number) => number,
  wy: (y: number) => number,
  _s: number,
) {
  const maxCount = Math.max(1, ...wh.aisles.map((a) => a.pickerCount));
  wh.aisles.forEach((a: Aisle, i: number) => {
    const t = a.pickerCount / maxCount;
    const color = heatColor(t);
    const dx = a.x2 - a.x1;
    const dy = a.y2 - a.y1;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    const hw = (a.width / 2);
    ctx.beginPath();
    ctx.moveTo(wx(a.x1 + nx * hw), wy(a.y1 + ny * hw));
    ctx.lineTo(wx(a.x2 + nx * hw), wy(a.y2 + ny * hw));
    ctx.lineTo(wx(a.x2 - nx * hw), wy(a.y2 - ny * hw));
    ctx.lineTo(wx(a.x1 - nx * hw), wy(a.y1 - ny * hw));
    ctx.closePath();
    ctx.fillStyle = rgbToCss(color, 0.35);
    ctx.fill();
  });
}

function drawShelves(
  ctx: CanvasRenderingContext2D,
  wh: Warehouse,
  wx: (x: number) => number,
  wy: (y: number) => number,
  _s: number,
) {
  wh.shelves.forEach((sh: Shelf) => {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(wx(sh.x), wy(sh.y), sh.w * _s, sh.h * _s);
    ctx.strokeStyle = sh.zone === "cold" ? "#1e40af" : "#334155";
    ctx.lineWidth = 1;
    ctx.strokeRect(wx(sh.x), wy(sh.y), sh.w * _s, sh.h * _s);
  });
}

function drawSlots(
  ctx: CanvasRenderingContext2D,
  wh: Warehouse,
  pickers: Picker[],
  wx: (x: number) => number,
  wy: (y: number) => number,
  _s: number,
) {
  const pickingSlotIds = new Set<string>();
  pickers.forEach((p) => {
    if (p.status === "picking" && p.currentWave) {
      const slotId = p.currentWave.slotIds[p.currentWave.currentStep];
      if (slotId) pickingSlotIds.add(slotId);
    }
  });
  const ss = Math.max(2, _s * 0.4);
  wh.slots.forEach((sl: Slot) => {
    const x = wx(sl.position.x) - ss / 2;
    const y = wy(sl.position.y) - ss / 2;
    if (pickingSlotIds.has(sl.id)) {
      ctx.shadowColor = sl.zone === "cold" ? "#3b82f6" : "#06b6d4";
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = sl.zone === "cold" ? "#3b82f6" : "#06b6d4";
    ctx.fillRect(x, y, ss, ss);
    ctx.shadowBlur = 0;
  });
}

function drawStagingAreas(
  ctx: CanvasRenderingContext2D,
  wh: Warehouse,
  wx: (x: number) => number,
  wy: (y: number) => number,
  _s: number,
) {
  wh.stagingAreas.forEach((sa) => {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1;
    ctx.strokeRect(wx(sa.x), wy(sa.y), sa.w * _s, sa.h * _s);
    ctx.setLineDash([]);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px sans-serif";
    ctx.fillText("暂存区", wx(sa.x) + 6, wy(sa.y) + 14);
  });
}

function drawPackingStations(
  ctx: CanvasRenderingContext2D,
  wh: Warehouse,
  wx: (x: number) => number,
  wy: (y: number) => number,
  _s: number,
) {
  wh.packingStations.forEach((ps: PackingStation) => {
    const w = 4 * _s;
    const h = 3 * _s;
    const x = wx(ps.position.x) - w / 2;
    const y = wy(ps.position.y) - h / 2;
    roundRect(ctx, x, y, w, h, 4);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.strokeStyle = ps.busy ? "#f59e0b" : "#22d3ee";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (ps.queue.length > 0) {
      const bx = x + w - 6;
      const by = y - 6;
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(ps.queue.length), bx, by);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }
  });
}

function drawEntrances(
  ctx: CanvasRenderingContext2D,
  wh: Warehouse,
  wx: (x: number) => number,
  wy: (y: number) => number,
  _s: number,
) {
  wh.entrances.forEach((e) => {
    const ts = _s * 1.5;
    ctx.beginPath();
    ctx.moveTo(wx(e.position.x), wy(e.position.y) - ts);
    ctx.lineTo(wx(e.position.x) - ts, wy(e.position.y) + ts);
    ctx.lineTo(wx(e.position.x) + ts, wy(e.position.y) + ts);
    ctx.closePath();
    ctx.fillStyle = "#22d3ee";
    ctx.fill();
  });
}

function drawPickerPaths(
  ctx: CanvasRenderingContext2D,
  pickers: Picker[],
  wx: (x: number) => number,
  wy: (y: number) => number,
  _s: number,
) {
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = "rgba(34, 211, 238, 0.6)";
  ctx.lineWidth = 1;
  pickers.forEach((p) => {
    if (!p.currentWave || p.currentWave.pathPoints.length < 2) return;
    const pts = p.currentWave.pathPoints.slice(p.currentWave.currentStep);
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(wx(p.position.x), wy(p.position.y));
    for (let i = 0; i < pts.length; i++) {
      ctx.lineTo(wx(pts[i].x), wy(pts[i].y));
    }
    ctx.stroke();
  });
  ctx.setLineDash([]);
}

function drawPickerTrails(
  ctx: CanvasRenderingContext2D,
  pickers: Picker[],
  wx: (x: number) => number,
  wy: (y: number) => number,
  _s: number,
) {
  pickers.forEach((p) => {
    const color = hexToRgb(PICKER_COLORS[p.status]);
    const trail = p.trail.slice(-5);
    trail.forEach((t, i) => {
      const alpha = ((i + 1) / trail.length) * 0.5;
      ctx.beginPath();
      ctx.arc(wx(t.x), wy(t.y), _s * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = rgbToCss(color, alpha);
      ctx.fill();
    });
  });
}

function drawPickers(
  ctx: CanvasRenderingContext2D,
  pickers: Picker[],
  wx: (x: number) => number,
  wy: (y: number) => number,
  _s: number,
) {
  pickers.forEach((p) => {
    const r = _s * 0.9;
    ctx.beginPath();
    ctx.arc(wx(p.position.x), wy(p.position.y), r, 0, Math.PI * 2);
    ctx.fillStyle = PICKER_COLORS[p.status];
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const idNum = p.id.replace("p-", "");
    ctx.fillText(idNum, wx(p.position.x), wy(p.position.y));
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  });
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  simTime: number,
  orders: Map<string, { status: string }>,
) {
  let picking = 0;
  let done = 0;
  orders.forEach((o) => {
    if (o.status === "picking" || o.status === "packing") picking++;
    else if (o.status === "done") done++;
  });
  const x = w - 12;
  const lines = [
    { label: "时间", value: formatTime(simTime), color: "#e2e8f0" },
    { label: "在拣", value: String(picking), color: "#22d3ee" },
    { label: "完成", value: String(done), color: "#22c55e" },
  ];
  ctx.textAlign = "right";
  ctx.font = "bold 13px monospace";
  lines.forEach((l, i) => {
    const y = 24 + i * 20;
    ctx.fillStyle = "#64748b";
    ctx.fillText(`${l.label} `, x - 48, y);
    ctx.fillStyle = l.color;
    ctx.fillText(l.value, x, y);
  });
  ctx.textAlign = "start";
}

import type {
  Warehouse,
  Aisle,
  Shelf,
  Slot,
  GraphNode,
  Product,
  PackingStation,
  StagingArea,
  Entrance,
  Zone,
} from "./types";
import type { Vec2 } from "@/utils/math";
import { rand } from "@/utils/math";

const COLD_PRODUCTS = [
  "鲜牛奶",
  "酸奶",
  "冷藏饺子",
  "鲜猪肉",
  "鲜鸡肉",
  "鲜牛肉",
  "三文鱼",
  "大虾",
  "鲜鸡蛋",
  "冷藏豆腐",
  "鲜奶油",
  "奶酪片",
];

const AMBIENT_PRODUCTS = [
  "大米",
  "面粉",
  "食用油",
  "酱油",
  "醋",
  "盐",
  "糖",
  "方便面",
  "饼干",
  "薯片",
  "矿泉水",
  "可乐",
  "纸巾",
  "洗衣液",
  "牙膏",
  "洗发水",
  "沐浴露",
  "卫生纸",
];

export interface WarehouseConfig {
  width: number;
  height: number;
  aisleRows: number;
  aisleCols: number;
  packingStationCount: number;
}

export function generateWarehouse(cfg: WarehouseConfig): Warehouse {
  const aisles: Aisle[] = [];
  const shelves: Shelf[] = [];
  const slots: Slot[] = [];
  const graphNodes: GraphNode[] = [];
  const slotToNode = new Map<string, string>();
  const products: Product[] = [];

  const marginX = 8;
  const marginY = 10;
  const packZoneW = 16;
  const innerW = cfg.width - marginX * 2 - packZoneW;
  const innerH = cfg.height - marginY * 2;

  const hAisleCount = cfg.aisleRows + 1;
  const vAisleCount = cfg.aisleCols + 1;
  const hAisleGap = innerH / hAisleCount;
  const vAisleGap = innerW / vAisleCount;
  const aisleWidth = 2.5;

  const hAisles: { y: number; x1: number; x2: number }[] = [];
  for (let r = 0; r < hAisleCount; r++) {
    const y = marginY + r * hAisleGap + hAisleGap / 2;
    const x1 = marginX;
    const x2 = marginX + innerW;
    hAisles.push({ y, x1, x2 });
    aisles.push({
      id: `h-${r}`,
      x1,
      y1: y,
      x2,
      y2: y,
      width: aisleWidth,
      pickerCount: 0,
    });
  }

  const vAisles: { x: number; y1: number; y2: number }[] = [];
  for (let c = 0; c < vAisleCount; c++) {
    const x = marginX + c * vAisleGap + vAisleGap / 2;
    const y1 = marginY;
    const y2 = marginY + innerH;
    vAisles.push({ x, y1, y2 });
    aisles.push({
      id: `v-${c}`,
      x1: x,
      y1,
      x2: x,
      y2,
      width: aisleWidth,
      pickerCount: 0,
    });
  }

  const nodeGrid: (string | null)[][] = [];
  for (let r = 0; r < hAisleCount; r++) {
    nodeGrid[r] = [];
    for (let c = 0; c < vAisleCount; c++) {
      const id = `n-${r}-${c}`;
      graphNodes.push({
        id,
        position: { x: vAisles[c].x, y: hAisles[r].y },
        neighbors: [],
      });
      nodeGrid[r][c] = id;
    }
  }
  for (let r = 0; r < hAisleCount; r++) {
    for (let c = 0; c < vAisleCount; c++) {
      const id = nodeGrid[r][c]!;
      const node = graphNodes.find((n) => n.id === id)!;
      if (r > 0) node.neighbors.push(nodeGrid[r - 1][c]!);
      if (r < hAisleCount - 1) node.neighbors.push(nodeGrid[r + 1][c]!);
      if (c > 0) node.neighbors.push(nodeGrid[r][c - 1]!);
      if (c < vAisleCount - 1) node.neighbors.push(nodeGrid[r][c + 1]!);
    }
  }

  const shelfW = vAisleGap - aisleWidth * 0.6;
  const shelfH = hAisleGap - aisleWidth * 0.6;
  const coldRowThreshold = Math.floor(cfg.aisleRows / 2);

  for (let r = 0; r < cfg.aisleRows; r++) {
    for (let c = 0; c < cfg.aisleCols; c++) {
      const zone: Zone = r < coldRowThreshold ? "cold" : "ambient";
      const cx = marginX + (c + 0.5) * vAisleGap + vAisleGap / 2;
      const cy = marginY + (r + 0.5) * hAisleGap + hAisleGap / 2;
      const x = cx - shelfW / 2;
      const y = cy - shelfH / 2;
      const shelf: Shelf = {
        id: `s-${r}-${c}`,
        row: r,
        col: c,
        zone,
        x,
        y,
        w: shelfW,
        h: shelfH,
      };
      shelves.push(shelf);

      const slotsPerShelf = 4;
      for (let s = 0; s < slotsPerShelf; s++) {
        const sy = y + (s + 0.5) * (shelfH / slotsPerShelf);
        const sx = zone === "cold" ? x + shelfW * 0.3 : x + shelfW * 0.7;
        const slotId = `sl-${r}-${c}-${s}`;
        let nearest: string | null = null;
        let nearestD = Infinity;
        for (const n of graphNodes) {
          const d = Math.hypot(n.position.x - sx, n.position.y - sy);
          if (d < nearestD) {
            nearestD = d;
            nearest = n.id;
          }
        }
        slots.push({
          id: slotId,
          shelfId: shelf.id,
          zone,
          position: { x: sx, y: sy },
          sku: null,
        });
        if (nearest) slotToNode.set(slotId, nearest);
      }
    }
  }

  const coldSlots = slots.filter((s) => s.zone === "cold");
  const ambientSlots = slots.filter((s) => s.zone === "ambient");

  const assignProduct = (
    list: string[],
    zone: Zone,
    pool: Slot[],
    prefix: string,
  ) => {
    let idx = 0;
    for (const name of list) {
      const sku = `${prefix}-${idx.toString().padStart(3, "0")}`;
      const slot = pool[idx % pool.length];
      slot.sku = sku;
      products.push({ sku, name, zone, slotId: slot.id });
      idx++;
    }
  };
  assignProduct(COLD_PRODUCTS, "cold", coldSlots, "C");
  assignProduct(AMBIENT_PRODUCTS, "ambient", ambientSlots, "A");

  const packingStations: PackingStation[] = [];
  const packX = cfg.width - packZoneW / 2 - 2;
  for (let i = 0; i < cfg.packingStationCount; i++) {
    const py =
      marginY + (i + 0.5) * (innerH / cfg.packingStationCount) + innerH * 0;
    packingStations.push({
      id: `ps-${i}`,
      position: {
        x: packX,
        y: Math.min(marginY + innerH - 2, Math.max(marginY + 2, py)),
      },
      busy: false,
      busyUntil: 0,
      queue: [],
      totalBusy: 0,
      currentOrderId: null,
    });
  }

  const stagingAreas: StagingArea[] = [
    {
      id: "stg-0",
      x: cfg.width - packZoneW,
      y: marginY + innerH - 6,
      w: packZoneW - 2,
      h: 5,
    },
  ];

  const entrances: Entrance[] = [
    {
      id: "ent-0",
      position: { x: marginX / 2, y: cfg.height / 2 },
    },
  ];

  const coldZoneRect = {
    x: marginX,
    y: marginY,
    w: innerW,
    h: coldRowThreshold * hAisleGap,
  };

  return {
    width: cfg.width,
    height: cfg.height,
    aisles,
    shelves,
    slots,
    graphNodes,
    slotToNode,
    products,
    packingStations,
    stagingAreas,
    entrances,
    coldZoneRect,
  };
}

export function findNearestPackingStation(
  warehouse: Warehouse,
  pos: Vec2,
): PackingStation {
  let best = warehouse.packingStations[0];
  let bestD = Infinity;
  for (const ps of warehouse.packingStations) {
    const d = Math.hypot(ps.position.x - pos.x, ps.position.y - pos.y);
    if (d < bestD) {
      bestD = d;
      best = ps;
    }
  }
  return best;
}

export function pickRandomSlotForSku(
  warehouse: Warehouse,
  sku: string,
): Slot | null {
  return warehouse.slots.find((s) => s.sku === sku) || null;
}

export function randomProduct(warehouse: Warehouse, zone?: Zone) {
  const pool = zone
    ? warehouse.products.filter((p) => p.zone === zone)
    : warehouse.products;
  return pool[Math.floor(rand(0, pool.length))];
}

import type { Order, Warehouse } from "@/simulation/types";
import type { Vec2 } from "@/utils/math";
import { kmeans } from "@/utils/math";

interface LocationClusterParams {
  pendingOrders: Order[];
  warehouse: Warehouse;
  k: number;
  maxPerWave: number;
}

export const batchOrders = ({
  pendingOrders,
  warehouse,
  k,
  maxPerWave,
}: LocationClusterParams): string[][] => {
  if (pendingOrders.length === 0) return [];

  const slotMap = new Map(warehouse.slots.map((s) => [s.id, s]));

  const centroids: Vec2[] = pendingOrders.map((order) => {
    const positions: Vec2[] = [];
    for (const item of order.items) {
      const slot = slotMap.get(item.slotId);
      if (slot) {
        positions.push(slot.position);
      }
    }
    if (positions.length === 0) {
      return { x: 0, y: 0 };
    }
    const sumX = positions.reduce((s, p) => s + p.x, 0);
    const sumY = positions.reduce((s, p) => s + p.y, 0);
    return { x: sumX / positions.length, y: sumY / positions.length };
  });

  const actualK = Math.min(k, pendingOrders.length);
  const labels = actualK > 0 ? kmeans(centroids, actualK) : [];

  const clusters: Map<number, string[]> = new Map();
  for (let i = 0; i < pendingOrders.length; i++) {
    const label = labels[i] ?? 0;
    if (!clusters.has(label)) {
      clusters.set(label, []);
    }
    clusters.get(label)!.push(pendingOrders[i].id);
  }

  const waves: string[][] = [];
  for (const orderIds of clusters.values()) {
    for (let i = 0; i < orderIds.length; i += maxPerWave) {
      waves.push(orderIds.slice(i, i + maxPerWave));
    }
  }

  return waves;
};

import type { Order, Warehouse } from "@/simulation/types";
import { jaccard } from "@/utils/math";

interface BasketClusterParams {
  pendingOrders: Order[];
  warehouse: Warehouse;
  similarityThreshold?: number;
  maxPerWave: number;
}

export const batchOrders = ({
  pendingOrders,
  warehouse,
  similarityThreshold = 0.3,
  maxPerWave,
}: BasketClusterParams): string[][] => {
  if (pendingOrders.length === 0) return [];

  const orderSkus = pendingOrders.map(
    (order) => new Set(order.items.map((item) => item.sku))
  );

  const assigned = new Set<string>();
  const waves: string[][] = [];

  while (assigned.size < pendingOrders.length) {
    const wave: string[] = [];

    let seedIdx = -1;
    for (let i = 0; i < pendingOrders.length; i++) {
      if (!assigned.has(pendingOrders[i].id)) {
        seedIdx = i;
        break;
      }
    }
    if (seedIdx === -1) break;

    const seedOrder = pendingOrders[seedIdx];
    const seedSkus = orderSkus[seedIdx];
    wave.push(seedOrder.id);
    assigned.add(seedOrder.id);

    const candidates: { idx: number; sim: number }[] = [];
    for (let i = 0; i < pendingOrders.length; i++) {
      if (assigned.has(pendingOrders[i].id)) continue;
      const sim = jaccard(seedSkus, orderSkus[i]);
      if (sim >= similarityThreshold) {
        candidates.push({ idx: i, sim });
      }
    }

    candidates.sort((a, b) => b.sim - a.sim);

    for (const { idx } of candidates) {
      if (wave.length >= maxPerWave) break;
      if (!assigned.has(pendingOrders[idx].id)) {
        wave.push(pendingOrders[idx].id);
        assigned.add(pendingOrders[idx].id);
      }
    }

    waves.push(wave);
  }

  return waves;
};

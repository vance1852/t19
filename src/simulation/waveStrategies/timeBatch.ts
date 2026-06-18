import type { Order } from "@/simulation/types";

interface TimeBatchParams {
  pendingOrders: Order[];
  now: number;
  window?: number;
  maxPerWave?: number;
}

export const batchOrders = ({
  pendingOrders,
  now,
  window = 120,
  maxPerWave = 8,
}: TimeBatchParams): string[][] => {
  const waves: string[][] = [];
  const sorted = [...pendingOrders].sort((a, b) => a.arrivalTime - b.arrivalTime);

  let i = 0;
  while (i < sorted.length) {
    const wave: string[] = [];
    const firstArrival = sorted[i].arrivalTime;

    while (i < sorted.length && wave.length < maxPerWave) {
      const order = sorted[i];
      const elapsed = now - order.arrivalTime;
      const windowReached = elapsed >= window;
      const sameWaveAsFirst = order.arrivalTime - firstArrival < window;

      if (wave.length === 0 || sameWaveAsFirst || windowReached) {
        wave.push(order.id);
        i++;
      } else {
        break;
      }
    }

    if (wave.length > 0) {
      waves.push(wave);
    }
  }

  return waves;
};

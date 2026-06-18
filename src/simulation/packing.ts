import type { Warehouse } from "./types";

export function processPacking(
  warehouse: Warehouse,
  time: number,
  dt: number,
  packingTimePerOrder: number
): string[] {
  const doneOrders: string[] = [];

  for (const station of warehouse.packingStations) {
    if (station.busy) {
      station.totalBusy += dt;
      if (time >= station.busyUntil) {
        station.busy = false;
        if (station.currentOrderId !== null) {
          doneOrders.push(station.currentOrderId);
        }
        station.currentOrderId = null;
      }
    }

    if (!station.busy && station.queue.length > 0) {
      const orderId = station.queue.shift()!;
      station.busy = true;
      station.busyUntil = time + packingTimePerOrder;
      station.currentOrderId = orderId;
    }
  }

  return doneOrders;
}

export function enqueuePacking(
  warehouse: Warehouse,
  orderId: string,
  stationId?: string
): void {
  if (stationId !== undefined) {
    const station = warehouse.packingStations.find((s) => s.id === stationId);
    if (station) {
      station.queue.push(orderId);
    }
    return;
  }

  let shortest = warehouse.packingStations[0];
  for (const station of warehouse.packingStations) {
    if (station.queue.length < shortest.queue.length) {
      shortest = station;
    }
  }
  shortest.queue.push(orderId);
}

export function getPackingUtilization(
  warehouse: Warehouse,
  totalSimTime: number
): number {
  if (warehouse.packingStations.length === 0) return 0;
  const totalBusy = warehouse.packingStations.reduce(
    (sum, s) => sum + s.totalBusy,
    0
  );
  return totalBusy / (warehouse.packingStations.length * totalSimTime);
}

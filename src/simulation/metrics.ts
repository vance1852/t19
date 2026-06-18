import { RollingWindow } from "@/utils/math";
import type {
  CompareResult,
  MetricsSnapshot,
  Order,
  Picker,
  Warehouse,
  WaveStrategy,
} from "./types";
import { getPackingUtilization } from "./packing";

export class MetricsCollector {
  doneOrders: Order[] = [];
  throughputWindow: RollingWindow = new RollingWindow(60);
  pendingWindow: RollingWindow = new RollingWindow(60);
  pickingWindow: RollingWindow = new RollingWindow(60);

  recordOrderDone(order: Order, time: number): void {
    this.doneOrders.push(order);
    this.throughputWindow.add(time, 1);
  }

  recordCounts(time: number, pending: number, picking: number): void {
    this.pendingWindow.add(time, pending);
    this.pickingWindow.add(time, picking);
  }

  snapshot(
    warehouse: Warehouse,
    pickers: Picker[],
    time: number
  ): MetricsSnapshot {
    let avgFulfillment = 0;
    if (this.doneOrders.length > 0) {
      const total = this.doneOrders.reduce(
        (sum, o) => sum + (o.doneTime! - o.arrivalTime),
        0
      );
      avgFulfillment = total / this.doneOrders.length;
    }

    const totalDistance = pickers.reduce((sum, p) => sum + p.totalDistance, 0);

    const throughputPerHour = this.throughputWindow.rate(time) * 3600;

    let coldAvgExposure = 0;
    const coldOrders = this.doneOrders.filter((o) => o.coldCount > 0);
    if (coldOrders.length > 0) {
      let totalExposure = 0;
      let coldItemCount = 0;
      for (const order of coldOrders) {
        const packStartTime = order.packStartTime ?? order.doneTime!;
        for (const item of order.items) {
          const slot = warehouse.slots.find((s) => s.id === item.slotId);
          if (slot && slot.zone === "cold" && item.pickedAt !== null) {
            totalExposure += packStartTime - item.pickedAt;
            coldItemCount++;
          }
        }
      }
      if (coldItemCount > 0) {
        coldAvgExposure = totalExposure / coldItemCount;
      }
    }

    const aisleCongestion = warehouse.aisles.map((a) => a.pickerCount);

    const packingUtilization = getPackingUtilization(
      warehouse,
      Math.max(1, time)
    );

    const pendingValues = this.pendingWindow.values();
    const pickingValues = this.pickingWindow.values();
    const pendingOrders =
      pendingValues.length > 0
        ? pendingValues[pendingValues.length - 1].v
        : 0;
    const pickingOrders =
      pickingValues.length > 0
        ? pickingValues[pickingValues.length - 1].v
        : 0;

    return {
      simTime: time,
      avgFulfillment,
      totalDistance,
      throughputPerHour,
      coldAvgExposure,
      aisleCongestion,
      packingUtilization,
      pendingOrders,
      pickingOrders,
      doneOrders: this.doneOrders.length,
    };
  }
}

export function getFinalSummary(
  collector: MetricsCollector,
  warehouse: Warehouse,
  pickers: Picker[],
  time: number,
  strategy: WaveStrategy
): CompareResult {
  const snap = collector.snapshot(warehouse, pickers, time);
  const maxCongestion =
    snap.aisleCongestion.length > 0 ? Math.max(...snap.aisleCongestion) : 0;

  return {
    strategy,
    avgFulfillment: snap.avgFulfillment,
    totalDistance: snap.totalDistance,
    throughputPerHour: snap.throughputPerHour,
    coldAvgExposure: snap.coldAvgExposure,
    packingUtilization: snap.packingUtilization,
    maxCongestion,
  };
}

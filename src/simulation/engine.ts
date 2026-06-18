import type {
  Warehouse,
  Order,
  Picker,
  Wave,
  MetricsSnapshot,
  SimParams,
  WaveStrategy,
  CompareResult,
} from "./types";
import {
  generateWarehouse,
  findNearestPackingStation,
  type WarehouseConfig,
} from "./warehouse";
import { createOrderGenerator, type OrderGenerator } from "./orderGen";
import { batchOrders as timeBatch } from "./waveStrategies/timeBatch";
import { batchOrders as locationCluster } from "./waveStrategies/locationCluster";
import { batchOrders as basketCluster } from "./waveStrategies/basketCluster";
import { planRoute } from "./pathPlanner";
import {
  createPicker,
  stepPicker,
  updateAisleCounts,
  createWave,
} from "./agents";
import { enqueuePacking, processPacking } from "./packing";
import { MetricsCollector, getFinalSummary } from "./metrics";

export interface SimState {
  warehouse: Warehouse;
  orders: Map<string, Order>;
  pickers: Picker[];
  waves: Wave[];
  metricsCollector: MetricsCollector;
  orderGenerator: OrderGenerator;
  metricsHistory: MetricsSnapshot[];
  simTime: number;
  lastWaveAt: number;
  waveSeq: number;
  metricsSeq: number;
  done: boolean;
}

export const DEFAULT_PARAMS: SimParams = {
  waveStrategy: "time",
  pickerCount: 4,
  packingStationCount: 3,
  orderArrivalPerHour: 120,
  coldRatio: 0.3,
  timeBatchWindow: 120,
  maxOrdersPerWave: 8,
  packingTimePerOrder: 30,
  pickingTimePerItem: 3,
  baseSpeed: 1.5,
  congestionAlpha: 0.3,
};

export const DT = 0.1;

export function createWarehouseConfig(params: SimParams): WarehouseConfig {
  return {
    width: 70,
    height: 50,
    aisleRows: 6,
    aisleCols: 6,
    packingStationCount: params.packingStationCount,
  };
}

export function createSimulation(params: SimParams = DEFAULT_PARAMS): SimState {
  const warehouse = generateWarehouse(createWarehouseConfig(params));
  const orderGenerator = createOrderGenerator(
    warehouse,
    params.orderArrivalPerHour,
    params.coldRatio,
  );
  const startPos = warehouse.entrances[0].position;
  const pickers: Picker[] = [];
  for (let i = 0; i < params.pickerCount; i++) {
    pickers.push(createPicker(`p-${i}`, { ...startPos }, params.baseSpeed));
  }
  return {
    warehouse,
    orders: new Map(),
    pickers,
    waves: [],
    metricsCollector: new MetricsCollector(),
    orderGenerator,
    metricsHistory: [],
    simTime: 0,
    lastWaveAt: 0,
    waveSeq: 0,
    metricsSeq: 0,
    done: false,
  };
}

function getPendingOrders(state: SimState): Order[] {
  const pending: Order[] = [];
  state.orders.forEach((o) => {
    if (o.status === "pending") pending.push(o);
  });
  return pending;
}

function getPickingOrders(state: SimState): number {
  let cnt = 0;
  state.orders.forEach((o) => {
    if (o.status === "picking" || o.status === "packing") cnt++;
  });
  return cnt;
}

function applyWaveStrategy(
  strategy: WaveStrategy,
  pending: Order[],
  state: SimState,
  params: SimParams,
): string[][] {
  switch (strategy) {
    case "time":
      return timeBatch({
        pendingOrders: pending,
        now: state.simTime,
        window: params.timeBatchWindow,
        maxPerWave: params.maxOrdersPerWave,
      });
    case "location":
      return locationCluster({
        pendingOrders: pending,
        warehouse: state.warehouse,
        k: Math.max(2, params.pickerCount),
        maxPerWave: params.maxOrdersPerWave,
      });
    case "basket":
      return basketCluster({
        pendingOrders: pending,
        warehouse: state.warehouse,
        similarityThreshold: 0.3,
        maxPerWave: params.maxOrdersPerWave,
      });
  }
}

function collectWaveSlotIds(orderIds: string[], state: SimState): string[] {
  const set = new Set<string>();
  for (const oid of orderIds) {
    const order = state.orders.get(oid);
    if (order) {
      for (const item of order.items) {
        set.add(item.slotId);
      }
    }
  }
  return Array.from(set);
}

export function stepSimulation(state: SimState, params: SimParams): void {
  if (state.done) return;
  const time = state.simTime;

  const newOrders = state.orderGenerator.generate(time + DT);
  for (const o of newOrders) {
    state.orders.set(o.id, o);
  }

  const pending = getPendingOrders(state);
  if (pending.length > 0) {
    const wavesOrderIds = applyWaveStrategy(
      params.waveStrategy,
      pending,
      state,
      params,
    );
    for (const orderIds of wavesOrderIds) {
      if (orderIds.length === 0) continue;
      state.waveSeq++;
      const slotIds = collectWaveSlotIds(orderIds, state);
      const wave = createWave(
        `w-${state.waveSeq}`,
        params.waveStrategy,
        orderIds,
        slotIds,
        time,
      );
      for (const oid of orderIds) {
        const order = state.orders.get(oid);
        if (order) {
          order.status = "picking";
          order.startTime = time;
        }
      }
      state.waves.push(wave);
    }
  }

  for (const picker of state.pickers) {
    if (picker.status === "idle" && !picker.currentWave) {
      let assignedWave: Wave | null = null;
      for (const w of state.waves) {
        if (w.pickerId === null) {
          assignedWave = w;
          break;
        }
      }
      if (assignedWave) {
        assignedWave.pickerId = picker.id;
        const endStation = findNearestPackingStation(
          state.warehouse,
          picker.position,
        );
        const route = planRoute(
          state.warehouse,
          picker.position,
          assignedWave.slotIds,
          endStation.position,
        );
        assignedWave.pathIds = route.nodePath;
        assignedWave.pathPoints = route.points;
        assignedWave.currentStep = 0;
        picker.currentWave = assignedWave;
        picker.status = "moving";
      }
    }
  }

  updateAisleCounts(state.warehouse, state.pickers);

  for (const picker of state.pickers) {
    const result = stepPicker(
      picker,
      state.warehouse,
      state.orders,
      time,
      DT,
      params.congestionAlpha,
      params.pickingTimePerItem,
    );
    if (result.arrivedAtPacking && picker.currentWave) {
      const wave = picker.currentWave;
      for (const oid of wave.orderIds) {
        const order = state.orders.get(oid);
        if (order) {
          order.status = "packing";
          order.packStartTime = time;
          enqueuePacking(state.warehouse, oid);
        }
      }
      picker.currentWave = null;
      picker.status = "idle";
      picker.targetPosition = null;
    }
  }

  state.waves = state.waves.filter((w) =>
    w.pickerId !== null || w.orderIds.length === 0 ? w.pickerId !== null : true,
  );
  state.waves = state.waves.filter((w) => w.pickerId !== null);

  const doneOrderIds = processPacking(
    state.warehouse,
    time,
    DT,
    params.packingTimePerOrder,
  );
  for (const oid of doneOrderIds) {
    const order = state.orders.get(oid);
    if (order) {
      order.status = "done";
      order.doneTime = time;
      state.metricsCollector.recordOrderDone(order, time);
    }
  }

  const pendingCnt = getPendingOrders(state).length;
  const pickingCnt = getPickingOrders(state);
  state.metricsCollector.recordCounts(time, pendingCnt, pickingCnt);

  state.metricsSeq++;
  if (state.metricsSeq % 5 === 0) {
    const snap = state.metricsCollector.snapshot(
      state.warehouse,
      state.pickers,
      time,
    );
    state.metricsHistory.push(snap);
    if (state.metricsHistory.length > 600) {
      state.metricsHistory.shift();
    }
  }

  state.simTime = time + DT;
}

export function runHeadless(
  params: SimParams,
  durationSec: number,
  onProgress?: (pct: number) => void,
): CompareResult {
  const state = createSimulation(params);
  const steps = Math.floor(durationSec / DT);
  for (let i = 0; i < steps; i++) {
    stepSimulation(state, params);
    if (onProgress && i % Math.max(1, Math.floor(steps / 20)) === 0) {
      onProgress(i / steps);
    }
  }
  return getFinalSummary(
    state.metricsCollector,
    state.warehouse,
    state.pickers,
    state.simTime,
    params.waveStrategy,
  );
}

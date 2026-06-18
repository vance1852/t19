import type {
  Warehouse,
  Picker,
  Wave,
  Order,
  WaveStrategy,
  SimParams,
} from "./types";
import type { Vec2 } from "@/utils/math";
import { dist, lerpVec } from "@/utils/math";

export function createPicker(
  id: string,
  startPos: Vec2,
  baseSpeed: number,
): Picker {
  return {
    id,
    status: "idle",
    position: { ...startPos },
    targetPosition: null,
    speed: baseSpeed,
    baseSpeed,
    totalDistance: 0,
    currentWave: null,
    slowUntil: 0,
    trail: [],
    pickingUntil: 0,
  };
}

function getPickerAisle(warehouse: Warehouse, pos: Vec2): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const aisle of warehouse.aisles) {
    const dx = aisle.x2 - aisle.x1;
    const dy = aisle.y2 - aisle.y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    const t = Math.max(
      0,
      Math.min(1, ((pos.x - aisle.x1) * dx + (pos.y - aisle.y1) * dy) / len2),
    );
    const projX = aisle.x1 + t * dx;
    const projY = aisle.y1 + t * dy;
    const d = Math.hypot(pos.x - projX, pos.y - projY);
    if (d < bestD && d < aisle.width * 0.8) {
      bestD = d;
      best = aisle.id;
    }
  }
  return best;
}

export function updateAisleCounts(
  warehouse: Warehouse,
  pickers: Picker[],
): void {
  for (const a of warehouse.aisles) {
    a.pickerCount = 0;
  }
  for (const p of pickers) {
    const aid = getPickerAisle(warehouse, p.position);
    if (aid) {
      const aisle = warehouse.aisles.find((a) => a.id === aid);
      if (aisle) aisle.pickerCount++;
    }
  }
}

export function computeEffectiveSpeed(
  picker: Picker,
  warehouse: Warehouse,
  time: number,
  alpha: number,
): number {
  const aid = getPickerAisle(warehouse, picker.position);
  let crowdFactor = 1;
  if (aid) {
    const aisle = warehouse.aisles.find((a) => a.id === aid);
    if (aisle) {
      crowdFactor = 1 + alpha * Math.max(0, aisle.pickerCount - 1);
    }
  }
  let slowFactor = 1;
  if (time < picker.slowUntil) {
    slowFactor = 0.5;
  }
  return (picker.baseSpeed / crowdFactor) * slowFactor;
}

export interface PickerStepResult {
  pickedSlotIds: string[];
  arrivedAtPacking: boolean;
}

export function stepPicker(
  picker: Picker,
  warehouse: Warehouse,
  orders: Map<string, Order>,
  time: number,
  dt: number,
  alpha: number,
  pickingTimePerItem: number,
): PickerStepResult {
  const result: PickerStepResult = {
    pickedSlotIds: [],
    arrivedAtPacking: false,
  };

  if (picker.status === "picking") {
    if (time >= picker.pickingUntil) {
      picker.status = picker.currentWave ? "moving" : "idle";
    }
    return result;
  }

  if (picker.status === "queuing" || picker.status === "packing") {
    return result;
  }

  if (!picker.currentWave) {
    picker.status = "idle";
    return result;
  }

  const wave = picker.currentWave;
  if (wave.currentStep >= wave.pathPoints.length) {
    result.arrivedAtPacking = true;
    return result;
  }

  const target = wave.pathPoints[wave.currentStep];
  picker.targetPosition = target;

  const effectiveSpeed = computeEffectiveSpeed(picker, warehouse, time, alpha);
  picker.speed = effectiveSpeed;

  const stepLen = effectiveSpeed * dt;
  const d = dist(picker.position, target);

  if (d <= stepLen) {
    const prevPos = { ...picker.position };
    picker.position = { ...target };
    picker.totalDistance += dist(prevPos, target);
    picker.trail.push({ ...picker.position });
    if (picker.trail.length > 8) picker.trail.shift();
    wave.currentStep++;

    const pointIdx = wave.currentStep - 1;
    const slotIndices = wave.visitSlotsAtPoint[pointIdx] ?? [];
    if (slotIndices.length > 0) {
      picker.status = "picking";
      picker.pickingUntil = time + pickingTimePerItem * slotIndices.length;
      for (const slotIdx of slotIndices) {
        const slotId = wave.slotIds[slotIdx];
        result.pickedSlotIds.push(slotId);
        for (const oid of wave.orderIds) {
          const order = orders.get(oid);
          if (order) {
            for (const item of order.items) {
              if (item.slotId === slotId && item.pickedAt === null) {
                item.pickedAt = time;
              }
            }
          }
        }
      }
    }
  } else {
    const t = stepLen / d;
    const prevPos = { ...picker.position };
    picker.position = lerpVec(picker.position, target, t);
    picker.totalDistance += dist(prevPos, picker.position);
    picker.trail.push({ ...picker.position });
    if (picker.trail.length > 8) picker.trail.shift();
    picker.status = "moving";
  }

  return result;
}

export function createWave(
  id: string,
  strategy: WaveStrategy,
  orderIds: string[],
  slotIds: string[],
  createdAt: number,
): Wave {
  return {
    id,
    strategy,
    orderIds,
    pickerId: null,
    slotIds,
    pathIds: [],
    pathPoints: [],
    visitSlotsAtPoint: [],
    currentStep: 0,
    createdAt,
  };
}

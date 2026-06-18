import type { Vec2 } from "@/utils/math";

export type Zone = "cold" | "ambient";

export type WaveStrategy = "time" | "location" | "basket";

export type PickerStatus =
  | "idle"
  | "moving"
  | "picking"
  | "queuing"
  | "packing";

export type OrderStatus = "pending" | "picking" | "packing" | "done";

export interface Aisle {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  pickerCount: number;
}

export interface Shelf {
  id: string;
  row: number;
  col: number;
  zone: Zone;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Slot {
  id: string;
  shelfId: string;
  zone: Zone;
  position: Vec2;
  sku: string | null;
}

export interface GraphNode {
  id: string;
  position: Vec2;
  neighbors: string[];
}

export interface Product {
  sku: string;
  name: string;
  zone: Zone;
  slotId: string;
}

export interface OrderItem {
  sku: string;
  slotId: string;
  qty: number;
  pickedAt: number | null;
}

export interface Order {
  id: string;
  arrivalTime: number;
  status: OrderStatus;
  items: OrderItem[];
  coldCount: number;
  startTime: number | null;
  packStartTime: number | null;
  doneTime: number | null;
}

export interface Wave {
  id: string;
  strategy: WaveStrategy;
  orderIds: string[];
  pickerId: string | null;
  slotIds: string[];
  pathIds: string[];
  pathPoints: Vec2[];
  currentStep: number;
  createdAt: number;
}

export interface Picker {
  id: string;
  status: PickerStatus;
  position: Vec2;
  targetPosition: Vec2 | null;
  speed: number;
  baseSpeed: number;
  totalDistance: number;
  currentWave: Wave | null;
  slowUntil: number;
  trail: Vec2[];
  pickingUntil: number;
}

export interface PackingStation {
  id: string;
  position: Vec2;
  busy: boolean;
  busyUntil: number;
  queue: string[];
  totalBusy: number;
  currentOrderId: string | null;
}

export interface StagingArea {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Entrance {
  id: string;
  position: Vec2;
}

export interface Warehouse {
  width: number;
  height: number;
  aisles: Aisle[];
  shelves: Shelf[];
  slots: Slot[];
  graphNodes: GraphNode[];
  slotToNode: Map<string, string>;
  products: Product[];
  packingStations: PackingStation[];
  stagingAreas: StagingArea[];
  entrances: Entrance[];
  coldZoneRect: { x: number; y: number; w: number; h: number };
}

export interface MetricsSnapshot {
  simTime: number;
  avgFulfillment: number;
  totalDistance: number;
  throughputPerHour: number;
  coldAvgExposure: number;
  aisleCongestion: number[];
  packingUtilization: number;
  pendingOrders: number;
  pickingOrders: number;
  doneOrders: number;
}

export interface SimParams {
  waveStrategy: WaveStrategy;
  pickerCount: number;
  packingStationCount: number;
  orderArrivalPerHour: number;
  coldRatio: number;
  timeBatchWindow: number;
  maxOrdersPerWave: number;
  packingTimePerOrder: number;
  pickingTimePerItem: number;
  baseSpeed: number;
  congestionAlpha: number;
}

export interface CompareResult {
  strategy: WaveStrategy;
  avgFulfillment: number;
  totalDistance: number;
  throughputPerHour: number;
  coldAvgExposure: number;
  packingUtilization: number;
  maxCongestion: number;
}

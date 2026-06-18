import type { Order, OrderItem, Product, Warehouse } from "./types";
import { randInt, sampleExp, sampleZipf } from "@/utils/math";

export class OrderGenerator {
  private warehouse: Warehouse;
  private arrivalPerHour: number;
  private coldRatio: number;
  private lastArrival: number;
  private orderSeq: number;
  private coldProducts: Product[];
  private ambientProducts: Product[];

  constructor(
    warehouse: Warehouse,
    arrivalPerHour: number = 120,
    coldRatio: number = 0.3
  ) {
    this.warehouse = warehouse;
    this.arrivalPerHour = arrivalPerHour;
    this.coldRatio = coldRatio;
    this.lastArrival = 0;
    this.orderSeq = 0;
    this.coldProducts = warehouse.products.filter((p) => p.zone === "cold");
    this.ambientProducts = warehouse.products.filter(
      (p) => p.zone === "ambient"
    );
  }

  private pickProduct(): Product {
    const useCold = Math.random() < this.coldRatio;
    const pool = useCold ? this.coldProducts : this.ambientProducts;
    const idx = sampleZipf(pool.length, 1.0);
    return pool[idx];
  }

  private generateOne(time_s: number): Order {
    this.orderSeq++;
    const itemCount = randInt(2, 8);
    const items: OrderItem[] = [];
    const usedSkus = new Set<string>();
    let coldCount = 0;

    for (let i = 0; i < itemCount; i++) {
      let product: Product;
      let attempts = 0;
      do {
        product = this.pickProduct();
        attempts++;
      } while (usedSkus.has(product.sku) && attempts < 10);
      usedSkus.add(product.sku);

      if (product.zone === "cold") coldCount++;
      items.push({
        sku: product.sku,
        slotId: product.slotId,
        qty: 1,
        pickedAt: null,
      });
    }

    return {
      id: `o-${this.orderSeq}`,
      arrivalTime: time_s,
      status: "pending",
      items,
      coldCount,
      startTime: null,
      packStartTime: null,
      doneTime: null,
    };
  }

  generate(time_s: number): Order[] {
    const orders: Order[] = [];
    const lambda = this.arrivalPerHour / 3600;

    if (this.lastArrival === 0) {
      this.lastArrival = time_s;
    }

    while (true) {
      const interval = sampleExp(lambda);
      const nextArrival = this.lastArrival + interval;
      if (nextArrival > time_s) break;
      this.lastArrival = nextArrival;
      orders.push(this.generateOne(nextArrival));
    }

    return orders;
  }
}

export function createOrderGenerator(
  warehouse: Warehouse,
  arrivalPerHour: number = 120,
  coldRatio: number = 0.3
): OrderGenerator {
  return new OrderGenerator(warehouse, arrivalPerHour, coldRatio);
}

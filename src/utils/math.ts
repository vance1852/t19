export type Vec2 = { x: number; y: number };

export const rand = (min: number, max: number): number => Math.random() * (max - min) + min;

export const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1));

export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const lerpVec = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export const sampleZipf = (n: number, s: number = 1.0): number => {
  const weights: number[] = [];
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    const w = 1 / Math.pow(i, s);
    weights.push(w);
    sum += w;
  }
  let r = Math.random() * sum;
  for (let i = 0; i < n; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return n - 1;
};

export const sampleExp = (lambda: number): number => -Math.log(1 - Math.random()) / lambda;

export const kmeans = (
  points: Vec2[],
  k: number,
  maxIter: number = 20
): number[] => {
  if (points.length === 0) return [];
  if (k >= points.length) return points.map((_, i) => i % k);
  const centers: Vec2[] = [];
  const used = new Set<number>();
  while (centers.length < k) {
    const idx = randInt(0, points.length - 1);
    if (!used.has(idx)) {
      used.add(idx);
      centers.push({ ...points[idx] });
    }
  }
  let labels: number[] = new Array(points.length).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < points.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let j = 0; j < k; j++) {
        const d = dist(points[i], centers[j]);
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
      if (labels[i] !== best) {
        labels[i] = best;
        changed = true;
      }
    }
    const sums: Vec2[] = Array.from({ length: k }, () => ({ x: 0, y: 0 }));
    const counts: number[] = new Array(k).fill(0);
    for (let i = 0; i < points.length; i++) {
      sums[labels[i]].x += points[i].x;
      sums[labels[i]].y += points[i].y;
      counts[labels[i]]++;
    }
    for (let j = 0; j < k; j++) {
      if (counts[j] > 0) {
        centers[j] = { x: sums[j].x / counts[j], y: sums[j].y / counts[j] };
      }
    }
    if (!changed) break;
  }
  return labels;
};

export const jaccard = (a: Set<string>, b: Set<string>): number => {
  let inter = 0;
  a.forEach((x) => {
    if (b.has(x)) inter++;
  });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
};

export const priorityQueue = <T>() => {
  const heap: { key: number; value: T }[] = [];
  const push = (key: number, value: T) => {
    heap.push({ key, value });
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p].key <= heap[i].key) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): { key: number; value: T } | undefined => {
    if (heap.length === 0) return undefined;
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      const n = heap.length;
      while (true) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let s = i;
        if (l < n && heap[l].key < heap[s].key) s = l;
        if (r < n && heap[r].key < heap[s].key) s = r;
        if (s === i) break;
        [heap[s], heap[i]] = [heap[i], heap[s]];
        i = s;
      }
    }
    return top;
  };
  const size = () => heap.length;
  return { push, pop, size };
};

export class RollingWindow {
  private window: { t: number; v: number }[] = [];
  constructor(private span: number) {}
  add(t: number, v: number) {
    this.window.push({ t, v });
    const cutoff = t - this.span;
    while (this.window.length > 0 && this.window[0].t < cutoff) {
      this.window.shift();
    }
  }
  sum(): number {
    return this.window.reduce((s, x) => s + x.v, 0);
  }
  avg(): number {
    return this.window.length === 0 ? 0 : this.sum() / this.window.length;
  }
  count(): number {
    return this.window.length;
  }
  rate(now: number): number {
    if (this.window.length < 2) return 0;
    const span = now - this.window[0].t;
    return span <= 0 ? 0 : this.sum() / span;
  }
  values() {
    return this.window.slice();
  }
}

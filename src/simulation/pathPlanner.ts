import type { Warehouse } from "./types";
import type { Vec2 } from "@/utils/math";
import { dist, priorityQueue } from "@/utils/math";

export function astar(
  warehouse: Warehouse,
  startNodeId: string,
  endNodeId: string,
): string[] {
  if (startNodeId === endNodeId) return [startNodeId];

  const nodeMap = new Map<string, { position: Vec2; neighbors: string[] }>();
  for (const n of warehouse.graphNodes) {
    nodeMap.set(n.id, { position: n.position, neighbors: n.neighbors });
  }

  const start = nodeMap.get(startNodeId);
  const end = nodeMap.get(endNodeId);
  if (!start || !end) return [];

  const gScore = new Map<string, number>();
  const cameFrom = new Map<string, string>();
  gScore.set(startNodeId, 0);

  const pq = priorityQueue<string>();
  pq.push(dist(start.position, end.position), startNodeId);

  while (pq.size() > 0) {
    const cur = pq.pop();
    if (!cur) break;
    const currentId = cur.value;
    const currentG = gScore.get(currentId)!;

    if (currentId === endNodeId) {
      const path: string[] = [currentId];
      let id = currentId;
      while (cameFrom.has(id)) {
        id = cameFrom.get(id)!;
        path.unshift(id);
      }
      return path;
    }

    const curF = cur.key;
    const curNode = nodeMap.get(currentId)!;
    const expectedF = currentG + dist(curNode.position, end.position);
    if (curF > expectedF + 1e-9) continue;

    for (const neighborId of curNode.neighbors) {
      const neighbor = nodeMap.get(neighborId);
      if (!neighbor) continue;
      const tentativeG = currentG + dist(curNode.position, neighbor.position);
      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeG);
        const f = tentativeG + dist(neighbor.position, end.position);
        pq.push(f, neighborId);
      }
    }
  }

  return [];
}

export function nearestNeighborTSP(distMatrix: number[][]): number[] {
  const n = distMatrix.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const visited = new Set<number>([0]);
  const tour: number[] = [0];
  let current = 0;

  while (visited.size < n) {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && distMatrix[current][j] < bestD) {
        bestD = distMatrix[current][j];
        best = j;
      }
    }
    if (best === -1) break;
    visited.add(best);
    tour.push(best);
    current = best;
  }

  return tour;
}

export function twoOpt(distMatrix: number[][], tour: number[]): number[] {
  if (tour.length <= 3) return tour.slice();

  let best = tour.slice();
  let improved = true;
  let iterations = 0;

  const tourDist = (t: number[]): number => {
    let d = 0;
    for (let i = 0; i < t.length - 1; i++) {
      d += distMatrix[t[i]][t[i + 1]];
    }
    return d;
  };

  while (improved && iterations < 50) {
    improved = false;
    iterations++;
    for (let i = 0; i < best.length - 2; i++) {
      for (let j = i + 2; j < best.length; j++) {
        const a = best[i];
        const b = best[i + 1];
        const c = best[j];
        const d = best[(j + 1) % best.length];

        if (j + 1 >= best.length) continue;

        const oldDist = distMatrix[a][b] + distMatrix[c][d];
        const newDist = distMatrix[a][c] + distMatrix[b][d];

        if (newDist < oldDist - 1e-9) {
          const newTour = best.slice(0, i + 1).concat(
            best.slice(i + 1, j + 1).reverse(),
          ).concat(best.slice(j + 1));
          if (tourDist(newTour) < tourDist(best)) {
            best = newTour;
            improved = true;
          }
        }
      }
    }
  }

  return best;
}

function findNearestNode(warehouse: Warehouse, pos: Vec2): string {
  let bestId = warehouse.graphNodes[0]?.id ?? "";
  let bestD = Infinity;
  for (const n of warehouse.graphNodes) {
    const d = dist(n.position, pos);
    if (d < bestD) {
      bestD = d;
      bestId = n.id;
    }
  }
  return bestId;
}

function getNodePosition(warehouse: Warehouse, nodeId: string): Vec2 | null {
  const node = warehouse.graphNodes.find((n) => n.id === nodeId);
  return node ? node.position : null;
}

export function planRoute(
  warehouse: Warehouse,
  startPos: Vec2,
  slotIds: string[],
  endPos: Vec2,
): { nodePath: string[]; points: Vec2[]; totalDist: number } {
  const startNodeId = findNearestNode(warehouse, startPos);
  const endNodeId = findNearestNode(warehouse, endPos);

  const slotNodeIds: string[] = [];
  for (const sid of slotIds) {
    const nodeId = warehouse.slotToNode.get(sid);
    if (nodeId) slotNodeIds.push(nodeId);
  }

  const targetNodeIds: string[] = [startNodeId, ...slotNodeIds, endNodeId];
  const m = targetNodeIds.length;

  if (m === 0) {
    return { nodePath: [], points: [], totalDist: 0 };
  }

  if (m === 1) {
    const pos = getNodePosition(warehouse, targetNodeIds[0]) ?? startPos;
    return { nodePath: [targetNodeIds[0]], points: [startPos, pos, endPos], totalDist: dist(startPos, endPos) };
  }

  const distMatrix: number[][] = Array.from({ length: m }, () =>
    new Array(m).fill(0),
  );
  const pathCache = new Map<string, string[]>();

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      if (i === j) {
        distMatrix[i][j] = 0;
        continue;
      }
      const key = `${targetNodeIds[i]}->${targetNodeIds[j]}`;
      const path = astar(warehouse, targetNodeIds[i], targetNodeIds[j]);
      pathCache.set(key, path);

      let d = 0;
      for (let k = 0; k < path.length - 1; k++) {
        const p1 = getNodePosition(warehouse, path[k]);
        const p2 = getNodePosition(warehouse, path[k + 1]);
        if (p1 && p2) d += dist(p1, p2);
      }
      distMatrix[i][j] = d;
    }
  }

  let tour: number[];
  if (m <= 2) {
    tour = targetNodeIds.map((_, i) => i);
  } else {
    const nnTour = nearestNeighborTSP(distMatrix);
    tour = twoOpt(distMatrix, nnTour);
  }

  const startIdx = tour.indexOf(0);
  if (startIdx > 0) {
    tour = tour.slice(startIdx).concat(tour.slice(0, startIdx));
  }

  const fullNodePath: string[] = [];
  const fullPoints: Vec2[] = [];
  let totalDist = 0;

  fullPoints.push(startPos);
  const startNodePos = getNodePosition(warehouse, startNodeId);
  if (startNodePos) {
    totalDist += dist(startPos, startNodePos);
  }

  for (let ti = 0; ti < tour.length - 1; ti++) {
    const fromIdx = tour[ti];
    const toIdx = tour[ti + 1];
    const fromNodeId = targetNodeIds[fromIdx];
    const toNodeId = targetNodeIds[toIdx];
    const key = `${fromNodeId}->${toNodeId}`;
    const segmentPath = pathCache.get(key) ?? [];

    if (ti === 0) {
      for (const nid of segmentPath) {
        fullNodePath.push(nid);
        const pos = getNodePosition(warehouse, nid);
        if (pos) fullPoints.push(pos);
      }
    } else {
      for (let k = 1; k < segmentPath.length; k++) {
        fullNodePath.push(segmentPath[k]);
        const pos = getNodePosition(warehouse, segmentPath[k]);
        if (pos) fullPoints.push(pos);
      }
    }

    totalDist += distMatrix[fromIdx][toIdx];

    if (toIdx >= 1 && toIdx <= slotNodeIds.length) {
      const slotIdx = toIdx - 1;
      const slotId = slotIds[slotIdx];
      const slot = warehouse.slots.find((s) => s.id === slotId);
      if (slot) {
        fullPoints.push(slot.position);
      }
    }
  }

  const lastNodePos = getNodePosition(warehouse, endNodeId);
  if (lastNodePos) {
    totalDist += dist(lastNodePos, endPos);
  }
  fullPoints.push(endPos);

  return {
    nodePath: fullNodePath,
    points: fullPoints,
    totalDist,
  };
}

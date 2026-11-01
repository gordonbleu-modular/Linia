import type { Stroke, Vec } from "./types";

/**
 * Marching squares. `values` is row-major, (rows+1) by (cols+1),
 * j increases with the mapped y of `mapPoint`.
 */
export function marchingSquares(
  cols: number,
  rows: number,
  values: Float64Array,
  level: number,
  mapPoint: (i: number, j: number) => Vec,
): Stroke[] {
  const segments: [Vec, Vec][] = [];
  const w = cols + 1;

  const at = (i: number, j: number) => values[j * w + i];

  const edgePoint = (i: number, j: number, edge: number): Vec => {
    if (edge === 0) return lerp(at(i, j), at(i + 1, j), mapPoint(i, j), mapPoint(i + 1, j));
    if (edge === 1) return lerp(at(i + 1, j), at(i + 1, j + 1), mapPoint(i + 1, j), mapPoint(i + 1, j + 1));
    if (edge === 2) return lerp(at(i + 1, j + 1), at(i, j + 1), mapPoint(i + 1, j + 1), mapPoint(i, j + 1));
    return lerp(at(i, j + 1), at(i, j), mapPoint(i, j + 1), mapPoint(i, j));
  };

  const lerp = (v1: number, v2: number, p1: Vec, p2: Vec): Vec => {
    const denom = v2 - v1;
    const t = denom === 0 ? 0.5 : (level - v1) / denom;
    return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
  };

  const push = (i: number, j: number, a: number, b: number) => {
    segments.push([edgePoint(i, j, a), edgePoint(i, j, b)]);
  };

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const v00 = at(i, j);
      const v10 = at(i + 1, j);
      const v11 = at(i + 1, j + 1);
      const v01 = at(i, j + 1);
      let idx = 0;
      if (v00 >= level) idx |= 1;
      if (v10 >= level) idx |= 2;
      if (v11 >= level) idx |= 4;
      if (v01 >= level) idx |= 8;
      if (idx === 0 || idx === 15) continue;
      if (idx === 5 || idx === 10) {
        const center = (v00 + v10 + v11 + v01) / 4;
        const centerIn = center >= level;
        if (idx === 5) {
          if (centerIn) {
            push(i, j, 0, 1);
            push(i, j, 2, 3);
          } else {
            push(i, j, 3, 0);
            push(i, j, 1, 2);
          }
        } else if (centerIn) {
          push(i, j, 3, 0);
          push(i, j, 1, 2);
        } else {
          push(i, j, 0, 1);
          push(i, j, 2, 3);
        }
        continue;
      }
      const pairs: Record<number, [number, number]> = {
        1: [3, 0],
        2: [0, 1],
        3: [3, 1],
        4: [1, 2],
        6: [0, 2],
        7: [2, 3],
        8: [2, 3],
        9: [0, 2],
        11: [1, 2],
        12: [1, 3],
        13: [0, 1],
        14: [3, 0],
      };
      const pair = pairs[idx];
      if (pair) push(i, j, pair[0], pair[1]);
    }
  }

  return chain(segments);
}

function chain(segments: [Vec, Vec][]): Stroke[] {
  if (segments.length === 0) return [];
  const eps = 1e-5;
  const key = (p: Vec) => `${Math.round(p[0] / eps)},${Math.round(p[1] / eps)}`;
  const adj = new Map<string, { seg: number; end: 0 | 1 }[]>();
  const add = (k: string, seg: number, end: 0 | 1) => {
    const list = adj.get(k);
    if (list) list.push({ seg, end });
    else adj.set(k, [{ seg, end }]);
  };
  segments.forEach((s, i) => {
    add(key(s[0]), i, 0);
    add(key(s[1]), i, 1);
  });
  const used = new Uint8Array(segments.length);
  const strokes: Stroke[] = [];

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const line: Stroke = [
      [segments[i][0][0], segments[i][0][1]],
      [segments[i][1][0], segments[i][1][1]],
    ];
    const extend = (atStart: boolean): boolean => {
      const p = atStart ? line[0] : line[line.length - 1];
      const list = adj.get(key(p));
      if (!list) return false;
      for (const item of list) {
        if (used[item.seg]) continue;
        used[item.seg] = 1;
        const seg = segments[item.seg];
        const other = seg[item.end === 0 ? 1 : 0];
        if (atStart) line.unshift([other[0], other[1]]);
        else line.push([other[0], other[1]]);
        return true;
      }
      return false;
    };
    let guard = 0;
    while (guard++ < segments.length + 2) {
      if (!extend(false) && !extend(true)) break;
    }
    if (line.length > 1) strokes.push(line);
  }
  return strokes;
}

export function fieldContours(
  cols: number,
  rows: number,
  sample: (x: number, y: number) => number,
  levels: number[],
  x0 = -1,
  y0 = -1,
  x1 = 1,
  y1 = 1,
): Stroke[] {
  const gw = cols + 1;
  const gh = rows + 1;
  const values = new Float64Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    const y = y0 + ((y1 - y0) * j) / rows;
    for (let i = 0; i < gw; i++) {
      const x = x0 + ((x1 - x0) * i) / cols;
      values[j * gw + i] = sample(x, y);
    }
  }
  const map = (i: number, j: number): Vec => [
    x0 + ((x1 - x0) * i) / cols,
    y0 + ((y1 - y0) * j) / rows,
  ];
  const strokes: Stroke[] = [];
  for (const level of levels) {
    for (const s of marchingSquares(cols, rows, values, level, map)) strokes.push(s);
  }
  return strokes;
}

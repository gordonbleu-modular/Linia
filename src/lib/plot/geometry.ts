import type { Stroke, Vec } from "./types";

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** Smallest positive lap count that nearly closes a curve with these frequencies.
 *  Whole numbers return 1. Fractions wind a few extra turns instead of leaving a gap. */
export function closureTurns(a: number, b = 1, cap = 12): number {
  const fa = Math.abs(a);
  const fb = Math.abs(b);
  let best = 1;
  let bestErr = Infinity;
  const limit = Math.max(1, Math.round(cap));
  for (let n = 1; n <= limit; n++) {
    const err = Math.abs(n * fa - Math.round(n * fa)) + Math.abs(n * fb - Math.round(n * fb));
    if (err < bestErr) {
      bestErr = err;
      best = n;
    }
    if (err < 0.012) return n;
  }
  return best;
}

/** Revolutions until radius A / radius B repeats. Matches r / gcd(R, r) for integers. */
export function ratioTurns(major: number, minor: number, cap = 28): number {
  const den = Math.max(1e-3, Math.abs(minor));
  const ratio = Math.abs(major) / den;
  let best = 1;
  let bestErr = Infinity;
  const limit = Math.max(1, Math.round(cap));
  for (let n = 1; n <= limit; n++) {
    const err = Math.abs(n * ratio - Math.round(n * ratio));
    if (err < bestErr) {
      bestErr = err;
      best = n;
    }
    if (err < 0.008) return n;
  }
  return best;
}

export function roundToStep(v: number, step: number): number {
  if (!(step > 0)) return v;
  const r = Math.round(v / step) * step;
  const decimals = step < 1 ? Math.min(6, Math.ceil(-Math.log10(step))) : 0;
  return Number(r.toFixed(decimals));
}

export function param(params: Record<string, number>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function sanitize(strokes: Stroke[]): Stroke[] {
  const out: Stroke[] = [];
  for (const stroke of strokes) {
    let cur: Stroke = [];
    for (const p of stroke) {
      if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
        if (cur.length > 1) out.push(cur);
        cur = [];
        continue;
      }
      const last = cur[cur.length - 1];
      if (last && last[0] === p[0] && last[1] === p[1]) continue;
      cur.push(p);
    }
    if (cur.length > 1) out.push(cur);
  }
  return out;
}

export function circle(cx: number, cy: number, r: number, seg: number): Stroke {
  const n = Math.max(8, Math.round(seg));
  const pts: Stroke = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

export function arc(cx: number, cy: number, r: number, a0: number, a1: number, seg: number): Stroke {
  const n = Math.max(2, Math.round(seg));
  const pts: Stroke = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

/** Sample t in [0, 1]. A null sample breaks the stroke. */
export function sample(n: number, fn: (t: number, i: number) => Vec | null): Stroke[] {
  const strokes: Stroke[] = [];
  let cur: Stroke | null = null;
  const count = Math.max(2, Math.round(n));
  for (let i = 0; i <= count; i++) {
    const p = fn(i / count, i);
    if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
      if (cur && cur.length > 1) strokes.push(cur);
      cur = null;
      continue;
    }
    if (!cur) cur = [];
    cur.push(p);
  }
  if (cur && cur.length > 1) strokes.push(cur);
  return strokes;
}

export function rdp(points: Stroke, eps: number): Stroke {
  const n = points.length;
  if (n < 3 || !(eps > 0)) return points;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  const eps2 = eps * eps;
  while (stack.length) {
    const pair = stack.pop();
    if (!pair) break;
    const [a, b] = pair;
    let maxD = 0;
    let idx = -1;
    const ax = points[a][0];
    const ay = points[a][1];
    const bx = points[b][0];
    const by = points[b][1];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const px = points[i][0];
      const py = points[i][1];
      let d2: number;
      if (len2 === 0) {
        const ex = px - ax;
        const ey = py - ay;
        d2 = ex * ex + ey * ey;
      } else {
        let t = ((px - ax) * dx + (py - ay) * dy) / len2;
        if (t < 0) t = 0;
        else if (t > 1) t = 1;
        const qx = ax + t * dx;
        const qy = ay + t * dy;
        const ex = px - qx;
        const ey = py - qy;
        d2 = ex * ex + ey * ey;
      }
      if (d2 > maxD) {
        maxD = d2;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > eps2) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  const out: Stroke = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(points[i]);
  return out.length > 1 ? out : points;
}

function dist2(a: Vec, b: Vec): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/** Join strokes that meet at their ends so the plotter lifts the pen less often. */
export function weldStrokes(strokes: Stroke[], eps: number): Stroke[] {
  const items = strokes.filter((s) => s.length > 1).map((s) => s.slice());
  if (items.length < 2 || !(eps > 0)) return items;
  const keyOf = (p: Vec) => `${Math.round(p[0] / eps)},${Math.round(p[1] / eps)}`;
  const adj = new Map<string, { index: number; at: 0 | 1 }[]>();
  const add = (k: string, index: number, at: 0 | 1) => {
    const list = adj.get(k);
    const item = { index, at };
    if (list) list.push(item);
    else adj.set(k, [item]);
  };
  items.forEach((s, index) => {
    add(keyOf(s[0]), index, 0);
    add(keyOf(s[s.length - 1]), index, 1);
  });
  const used = new Uint8Array(items.length);
  const out: Stroke[] = [];
  const eps2 = eps * eps;
  for (let i = 0; i < items.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    let line = items[i].slice();
    const extend = (atStart: boolean): boolean => {
      const point = atStart ? line[0] : line[line.length - 1];
      const list = adj.get(keyOf(point));
      if (!list) return false;
      for (const item of list) {
        if (used[item.index]) continue;
        used[item.index] = 1;
        const extra = items[item.index].slice();
        if (atStart === (item.at === 0)) extra.reverse();
        line = atStart ? extra.slice(0, -1).concat(line) : line.concat(extra.slice(1));
        return true;
      }
      return false;
    };
    let guard = 0;
    while (guard++ < items.length + 2) {
      if (!extend(false) && !extend(true)) break;
    }
    if (line.length > 2 && dist2(line[0], line[line.length - 1]) <= eps2) {
      line[line.length - 1] = [line[0][0], line[0][1]];
    }
    if (line.length > 1) out.push(line);
  }
  return out;
}

/** Greedy nearest-neighbour ordering. Reverses a stroke when its end is closer. */
export function sortStrokes(strokes: Stroke[]): Stroke[] {
  const rem = strokes.filter((s) => s.length > 1).map((s) => s.slice());
  if (rem.length < 2) return rem;
  let bestI = 0;
  let bestD = Infinity;
  for (let i = 0; i < rem.length; i++) {
    const d = rem[i][0][0] ** 2 + rem[i][0][1] ** 2;
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  const out: Stroke[] = [rem.splice(bestI, 1)[0]];
  while (rem.length) {
    const tail = out[out.length - 1];
    const end = tail[tail.length - 1];
    let best = 0;
    let flip = false;
    let score = Infinity;
    for (let i = 0; i < rem.length; i++) {
      const s = rem[i];
      const d0 = dist2(end, s[0]);
      const d1 = dist2(end, s[s.length - 1]);
      if (d0 < score) {
        score = d0;
        best = i;
        flip = false;
      }
      if (d1 < score) {
        score = d1;
        best = i;
        flip = true;
      }
    }
    const next = rem.splice(best, 1)[0];
    if (flip) next.reverse();
    out.push(next);
  }
  return out;
}

export function fitStrokes(strokes: Stroke[], paperW: number, paperH: number, margin: number): Stroke[] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of strokes) {
    for (const [x, y] of s) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return [];
  const bw = Math.max(1e-9, maxX - minX);
  const bh = Math.max(1e-9, maxY - minY);
  const availW = Math.max(1, paperW - 2 * margin);
  const availH = Math.max(1, paperH - 2 * margin);
  const scale = Math.min(availW / bw, availH / bh);
  const ox = margin + (availW - bw * scale) / 2;
  const oy = margin + (availH - bh * scale) / 2;
  return strokes.map((s) =>
    s.map(([x, y]) => [ox + (x - minX) * scale, oy + (maxY - y) * scale] as Vec),
  );
}

export function polylineLength(strokes: Stroke[]): number {
  let length = 0;
  for (const s of strokes) {
    for (let i = 1; i < s.length; i++) {
      length += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
    }
  }
  return length;
}

export function travelLength(strokes: Stroke[]): number {
  let length = 0;
  for (let i = 1; i < strokes.length; i++) {
    const a = strokes[i - 1];
    const b = strokes[i];
    const p = a[a.length - 1];
    const q = b[0];
    length += Math.hypot(p[0] - q[0], p[1] - q[1]);
  }
  return length;
}

export function pointCount(strokes: Stroke[]): number {
  let n = 0;
  for (const s of strokes) n += s.length;
  return n;
}

export function cropMarks(w: number, h: number, margin: number): Stroke[] {
  if (margin < 8) return [];
  const len = Math.min(6, margin - 2.5);
  const gap = 1.2;
  if (!(len > 1)) return [];
  const m = margin;
  const corners: [number, number, number, number][] = [
    [m, m, -1, -1],
    [w - m, m, 1, -1],
    [m, h - m, -1, 1],
    [w - m, h - m, 1, 1],
  ];
  const strokes: Stroke[] = [];
  for (const [x, y, sx, sy] of corners) {
    strokes.push([
      [x + sx * gap, y],
      [x + sx * (gap + len), y],
    ]);
    strokes.push([
      [x, y + sy * gap],
      [x, y + sy * (gap + len)],
    ]);
  }
  return strokes;
}

export function strokesToD(strokes: Stroke[], digits = 2): string {
  const parts: string[] = [];
  for (const s of strokes) {
    if (s.length < 2) continue;
    parts.push(`M${s[0][0].toFixed(digits)} ${s[0][1].toFixed(digits)}`);
    for (let i = 1; i < s.length; i++) {
      parts.push(`L${s[i][0].toFixed(digits)} ${s[i][1].toFixed(digits)}`);
    }
  }
  return parts.join("");
}

export function travelToD(strokes: Stroke[], digits = 2): string {
  const parts: string[] = [];
  for (let i = 1; i < strokes.length; i++) {
    const a = strokes[i - 1];
    const b = strokes[i];
    const p = a[a.length - 1];
    const q = b[0];
    parts.push(
      `M${p[0].toFixed(digits)} ${p[1].toFixed(digits)}L${q[0].toFixed(digits)} ${q[1].toFixed(digits)}`,
    );
  }
  return parts.join("");
}

export type Layout = {
  strokes: Stroke[];
  penDown: number;
  penUp: number;
  points: number;
};

export function layoutDrawing(
  raw: Stroke[],
  opt: { w: number; h: number; margin: number; smooth: number; sort: boolean; marks: boolean },
): Layout {
  const fitted = fitStrokes(raw, opt.w, opt.h, opt.margin);
  const simplified = opt.smooth > 0 ? fitted.map((s) => rdp(s, opt.smooth)) : fitted;
  const welded = weldStrokes(simplified, 0.15);
  const marks = opt.marks ? cropMarks(opt.w, opt.h, opt.margin) : [];
  const merged = marks.length ? [...marks, ...welded] : welded;
  const strokes = opt.sort ? sortStrokes(merged) : merged;
  return {
    strokes,
    penDown: polylineLength(strokes),
    penUp: travelLength(strokes),
    points: pointCount(strokes),
  };
}

export function marginFrame(w: number, h: number, margin: number): Stroke {
  const x0 = margin;
  const y0 = margin;
  const x1 = Math.max(margin, w - margin);
  const y1 = Math.max(margin, h - margin);
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
  ];
}

/** How many times the pen enters the same pen-width cell. One continuous pass counts once. */
export type OverlapReport = {
  max: number;
  warnAt: number;
  cell: number;
  hot: Array<{ x: number; y: number }>;
};

export function soakLimit(penMm: number): number {
  if (penMm >= 0.8) return 5;
  if (penMm >= 0.45) return 8;
  return 10;
}

export function penOverlap(strokes: Stroke[], penMm: number): OverlapReport {
  const cell = Math.max(0.4, penMm);
  const warnAt = soakLimit(penMm);
  const inv = 1 / cell;
  const counts = new Map<number, number>();
  let max = 0;
  const keyOf = (x: number, y: number) => Math.floor(x * inv) * 8192 + Math.floor(y * inv);
  for (const stroke of strokes) {
    if (stroke.length < 2) continue;
    let prev = Number.NaN;
    for (let i = 1; i < stroke.length; i++) {
      const x0 = stroke[i - 1][0];
      const y0 = stroke[i - 1][1];
      const x1 = stroke[i][0];
      const y1 = stroke[i][1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.ceil(len / (cell * 0.85)));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const key = keyOf(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
        if (key === prev) continue;
        prev = key;
        const next = (counts.get(key) ?? 0) + 1;
        counts.set(key, next);
        if (next > max) max = next;
      }
    }
  }
  const hot: Array<{ x: number; y: number; n: number }> = [];
  if (max >= warnAt) {
    for (const [key, n] of counts) {
      if (n < warnAt) continue;
      const ix = Math.floor(key / 8192);
      const iy = key - ix * 8192;
      hot.push({ x: ix * cell, y: iy * cell, n });
    }
    hot.sort((a, b) => b.n - a.n);
    if (hot.length > 900) hot.length = 900;
  }
  return { max, warnAt, cell, hot };
}

export function formatLength(mm: number): string {
  if (mm >= 1000) {
    return `${(mm / 1000).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} m`;
  }
  return `${Math.round(mm).toLocaleString("en-US")} mm`;
}

export function formatParam(value: number, spec: { step: number; integer?: boolean; names?: string[] }): string {
  if (spec.names) {
    const i = clamp(Math.round(value), 0, spec.names.length - 1);
    return spec.names[i] ?? String(value);
  }
  if (spec.integer || spec.step >= 1) return Math.round(value).toLocaleString("en-US");
  const digits = spec.step < 0.1 ? 2 : 1;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

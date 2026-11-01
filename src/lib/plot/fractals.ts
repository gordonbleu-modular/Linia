import { fieldContours } from "./contour";
import { param } from "./geometry";
import type { Generator, Stroke, Vec } from "./types";

function turtle(seq: string, angleDeg: number, step: number, draw: Set<string>): Stroke[] {
  const turn = (angleDeg * Math.PI) / 180;
  const strokes: Stroke[] = [];
  let cur: Stroke | null = null;
  const stack: { x: number; y: number; a: number }[] = [];
  let x = 0;
  let y = 0;
  let a = -Math.PI / 2;
  const flush = () => {
    if (cur && cur.length > 1) strokes.push(cur);
    cur = null;
  };
  for (const c of seq) {
    if (draw.has(c)) {
      const nx = x + Math.cos(a) * step;
      const ny = y + Math.sin(a) * step;
      if (!cur) cur = [[x, y]];
      cur.push([nx, ny]);
      x = nx;
      y = ny;
    } else if (c === "+") a += turn;
    else if (c === "-") a -= turn;
    else if (c === "[") {
      flush();
      stack.push({ x, y, a });
    } else if (c === "]") {
      flush();
      const s = stack.pop();
      if (s) {
        x = s.x;
        y = s.y;
        a = s.a;
      }
    }
  }
  flush();
  return strokes;
}

function expand(axiom: string, rules: Record<string, string>, depth: number): string {
  let s = axiom;
  for (let i = 0; i < depth; i++) {
    if (s.length > 180000) break;
    let next = "";
    for (const c of s) next += rules[c] ?? c;
    s = next;
    if (s.length > 220000) break;
  }
  return s;
}

function kochSide(a: Vec, b: Vec, depth: number, angle: number, out: Vec[]) {
  if (depth <= 0) {
    if (out.length === 0) out.push(a);
    out.push(b);
    return;
  }
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const p1: Vec = [a[0] + dx / 3, a[1] + dy / 3];
  const p3: Vec = [a[0] + (2 * dx) / 3, a[1] + (2 * dy) / 3];
  const vx = p3[0] - p1[0];
  const vy = p3[1] - p1[1];
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const peak: Vec = [p1[0] + vx * cos - vy * sin, p1[1] + vx * sin + vy * cos];
  kochSide(a, p1, depth - 1, angle, out);
  kochSide(p1, peak, depth - 1, angle, out);
  kochSide(peak, p3, depth - 1, angle, out);
  kochSide(p3, b, depth - 1, angle, out);
}

function hilbertD2xy(d: number, order: number): Vec {
  let x = 0;
  let y = 0;
  let t = d;
  const n = 1 << order;
  for (let s = 1; s < n; s *= 2) {
    const rx = 1 & Math.floor(t / 2);
    const ry = 1 & (t ^ rx);
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      const tmp = x;
      x = y;
      y = tmp;
    }
    x += s * rx;
    y += s * ry;
    t = Math.floor(t / 4);
  }
  return [x, y];
}

const LPRESETS: { name: string; axiom: string; rules: Record<string, string>; angle: number; cap: number; draw: string[] }[] = [
  {
    name: "Tree",
    axiom: "X",
    rules: { X: "F+[[X]-X]-F[-FX]+X", F: "FF" },
    angle: 25,
    cap: 6,
    draw: ["F"],
  },
  {
    name: "Fern",
    axiom: "X",
    rules: { X: "F[+X][-X]FX", F: "FF" },
    angle: 22,
    cap: 6,
    draw: ["F"],
  },
  {
    name: "Shrub",
    axiom: "F",
    rules: { F: "F[+F]F[-F]F" },
    angle: 25,
    cap: 5,
    draw: ["F"],
  },
  {
    name: "Island",
    axiom: "F+F+F+F",
    rules: { F: "F+F-F-FF+F+F-F" },
    angle: 90,
    cap: 3,
    draw: ["F"],
  },
];

export const fractalGens: Generator[] = [
  {
    id: "koch",
    name: "Koch",
    group: "Fractals",
    hint: "Snowflake or a single curve. 60° is the classic Koch curve.",
    params: [
      { key: "tiefe", label: "Depth", min: 0, max: 6, step: 1, def: 4, integer: true },
      { key: "winkel", label: "Angle", min: 20, max: 85, step: 0.5, def: 60 },
      { key: "form", label: "Shape", min: 0, max: 1, step: 1, def: 1, integer: true, names: ["Curve", "Flake"] },
    ],
    draw: (p) => {
      const depth = Math.round(param(p, "tiefe", 4));
      const angle = param(p, "winkel", 60);
      const flake = Math.round(param(p, "form", 1)) === 1;
      const strokes: Stroke[] = [];
      if (!flake) {
        const pts: Vec[] = [];
        kochSide([-1, 0], [1, 0], depth, angle, pts);
        strokes.push(pts);
        return strokes;
      }
      const verts: Vec[] = [];
      for (let s = 0; s < 3; s++) {
        const a = -Math.PI / 2 + (s * Math.PI * 2) / 3;
        verts.push([Math.cos(a), Math.sin(a)]);
      }
      for (let s = 0; s < 3; s++) {
        const pts: Vec[] = [];
        kochSide(verts[s], verts[(s + 1) % 3], depth, angle, pts);
        strokes.push(pts);
      }
      return strokes;
    },
  },
  {
    id: "dragon",
    name: "Dragon",
    group: "Fractals",
    hint: "The dragon curve, folded from a single line. From order 12 it grows dense.",
    params: [{ key: "stufe", label: "Order", min: 4, max: 16, step: 1, def: 12, integer: true }],
    draw: (p) => {
      const order = Math.round(param(p, "stufe", 12));
      let pts: Stroke = [
        [0, 0],
        [1, 0],
      ];
      for (let i = 0; i < order; i++) {
        const end = pts[pts.length - 1];
        const next = pts.slice();
        for (let k = pts.length - 2; k >= 0; k--) {
          const dx = pts[k][0] - end[0];
          const dy = pts[k][1] - end[1];
          next.push([end[0] - dy, end[1] + dx]);
        }
        pts = next;
      }
      return [pts];
    },
  },
  {
    id: "hilbert",
    name: "Hilbert",
    group: "Fractals",
    hint: "A space-filling curve in one stroke. Each order quadruples the length.",
    params: [{ key: "stufe", label: "Order", min: 1, max: 7, step: 1, def: 5, integer: true }],
    draw: (p) => {
      const order = Math.round(param(p, "stufe", 5));
      const n = 1 << order;
      const pts: Stroke = [];
      const total = n * n;
      for (let i = 0; i < total; i++) pts.push(hilbertD2xy(i, order));
      return [pts];
    },
  },
  {
    id: "levy",
    name: "Lévy-C",
    group: "Fractals",
    hint: "Each segment is replaced by a right-angled roof. A loose, pointed curve.",
    params: [{ key: "stufe", label: "Order", min: 1, max: 14, step: 1, def: 11, integer: true }],
    draw: (p) => {
      const order = Math.round(param(p, "stufe", 11));
      let pts: Stroke = [
        [0, 0],
        [1, 0],
      ];
      for (let i = 0; i < order; i++) {
        const next: Stroke = [];
        for (let k = 0; k < pts.length - 1; k++) {
          const a = pts[k];
          const b = pts[k + 1];
          const mx = (a[0] + b[0]) / 2;
          const my = (a[1] + b[1]) / 2;
          const dx = (b[0] - a[0]) / 2;
          const dy = (b[1] - a[1]) / 2;
          next.push(a, [mx - dy, my + dx]);
        }
        next.push(pts[pts.length - 1]);
        pts = next;
      }
      return [pts];
    },
  },
  {
    id: "arrow",
    name: "Arrowhead",
    group: "Fractals",
    hint: "Sierpinski arrowhead: one continuous curve through the triangle.",
    params: [{ key: "stufe", label: "Order", min: 1, max: 8, step: 1, def: 6, integer: true }],
    draw: (p) => {
      const order = Math.round(param(p, "stufe", 6));
      let s = "A";
      for (let i = 0; i < order; i++) {
        let next = "";
        for (const c of s) {
          if (c === "A") next += "B-A-B";
          else if (c === "B") next += "A+B+A";
          else next += c;
        }
        s = next;
      }
      return turtle(s, 60, 1, new Set(["A", "B"]));
    },
  },
  {
    id: "lsystem",
    name: "L-System",
    group: "Fractals",
    hint: "A plant or an island from replacement rules. The offset tilts the system's angle.",
    params: [
      {
        key: "satz",
        label: "System",
        min: 0,
        max: 3,
        step: 1,
        def: 0,
        integer: true,
        names: LPRESETS.map((p) => p.name),
      },
      { key: "tiefe", label: "Depth", min: 1, max: 7, step: 1, def: 5, integer: true },
      { key: "versatz", label: "Angle offset", min: -24, max: 24, step: 0.5, def: 0 },
    ],
    draw: (p) => {
      const idx = Math.max(0, Math.min(LPRESETS.length - 1, Math.round(param(p, "satz", 0))));
      const preset = LPRESETS[idx];
      const depth = Math.min(preset.cap, Math.round(param(p, "tiefe", 5)));
      const seq = expand(preset.axiom, preset.rules, depth);
      return turtle(seq, preset.angle + param(p, "versatz", 0), 1, new Set(preset.draw));
    },
  },
  {
    id: "pythagoras",
    name: "Pythagoras",
    group: "Fractals",
    hint: "Squares on squares. The angle splits the roof between the left and right branch.",
    params: [
      { key: "tiefe", label: "Depth", min: 0, max: 9, step: 1, def: 6, integer: true },
      { key: "winkel", label: "Angle", min: 15, max: 75, step: 0.5, def: 34 },
    ],
    draw: (p) => {
      const depth = Math.round(param(p, "tiefe", 6));
      const ang = (param(p, "winkel", 34) * Math.PI) / 180;
      const strokes: Stroke[] = [];
      const square = (ax: number, ay: number, ux: number, uy: number, level: number) => {
        const px = -uy;
        const py = ux;
        const bx = ax + ux;
        const by = ay + uy;
        const cx = bx + px;
        const cy = by + py;
        const dx = ax + px;
        const dy = ay + py;
        strokes.push([
          [ax, ay],
          [bx, by],
          [cx, cy],
          [dx, dy],
          [ax, ay],
        ]);
        if (level <= 0) return;
        const L = Math.hypot(ux, uy) || 1;
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        const tx = ux / L;
        const ty = uy / L;
        const nx = px / L;
        const ny = py / L;
        const apexX = dx + tx * (L * c * c) + nx * (L * c * s);
        const apexY = dy + ty * (L * c * c) + ny * (L * c * s);
        square(dx, dy, apexX - dx, apexY - dy, level - 1);
        square(apexX, apexY, cx - apexX, cy - apexY, level - 1);
      };
      square(-0.5, -0.55, 1, 0, depth);
      return strokes;
    },
  },
  {
    id: "mandelbrot",
    name: "Mandelbrot",
    group: "Fractals",
    hint: "Contours of the iteration count. The innermost line follows the boundary of the set.",
    params: [
      { key: "cx", label: "Center X", min: -2, max: 1, step: 0.01, def: -0.65 },
      { key: "cy", label: "Center Y", min: -1.3, max: 1.3, step: 0.01, def: 0 },
      { key: "span", label: "Zoom", min: 0.02, max: 1.6, step: 0.01, def: 1.35 },
      { key: "iter", label: "Iterations", min: 12, max: 80, step: 1, def: 36, integer: true },
      { key: "baender", label: "Bands", min: 2, max: 10, step: 1, def: 6, integer: true },
      { key: "raster", label: "Grid", min: 60, max: 180, step: 10, def: 110, integer: true },
    ],
    draw: (p) => {
      const cx = param(p, "cx", -0.65);
      const cy = param(p, "cy", 0);
      const span = Math.max(0.02, param(p, "span", 1.35));
      const maxIter = Math.round(param(p, "iter", 36));
      const bands = Math.round(param(p, "baender", 6));
      const grid = Math.round(param(p, "raster", 110));
      const sampleAt = (x: number, y: number) => {
        const cr = cx + x * span;
        const ci = cy + y * span;
        let zr = 0;
        let zi = 0;
        let i = 0;
        while (zr * zr + zi * zi <= 4 && i < maxIter) {
          const nr = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = nr;
          i++;
        }
        return i;
      };
      const levels: number[] = [];
      for (let b = 1; b <= bands; b++) {
        levels.push(Math.max(2, Math.round((b / bands) * (maxIter - 1))));
      }
      return fieldContours(grid, grid, sampleAt, levels);
    },
  },
  {
    id: "julia",
    name: "Julia",
    group: "Fractals",
    hint: "A Julia set for a fixed constant c. Small changes of c switch the motif.",
    params: [
      { key: "cr", label: "c real", min: -1.2, max: 0.6, step: 0.005, def: -0.8 },
      { key: "ci", label: "c imaginary", min: -1, max: 1, step: 0.005, def: 0.156 },
      { key: "span", label: "Zoom", min: 0.15, max: 1.8, step: 0.01, def: 1.5 },
      { key: "iter", label: "Iterations", min: 12, max: 80, step: 1, def: 40, integer: true },
      { key: "baender", label: "Bands", min: 2, max: 10, step: 1, def: 6, integer: true },
      { key: "raster", label: "Grid", min: 60, max: 180, step: 10, def: 110, integer: true },
    ],
    draw: (p) => {
      const cr = param(p, "cr", -0.8);
      const ci = param(p, "ci", 0.156);
      const span = Math.max(0.1, param(p, "span", 1.5));
      const maxIter = Math.round(param(p, "iter", 40));
      const bands = Math.round(param(p, "baender", 6));
      const grid = Math.round(param(p, "raster", 110));
      const sampleAt = (x: number, y: number) => {
        let zr = x * span;
        let zi = y * span;
        let i = 0;
        while (zr * zr + zi * zi <= 4 && i < maxIter) {
          const nr = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = nr;
          i++;
        }
        return i;
      };
      const levels: number[] = [];
      for (let b = 1; b <= bands; b++) {
        levels.push(Math.max(2, Math.round((b / bands) * (maxIter - 1))));
      }
      return fieldContours(grid, grid, sampleAt, levels);
    },
  },
];

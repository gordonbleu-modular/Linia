import { circle, param } from "./geometry";
import type { Generator, Stroke, Vec } from "./types";

const TAU = Math.PI * 2;

function smooth(pts: Stroke, window: number): Stroke {
  const w = Math.max(1, Math.round(window));
  if (w <= 1 || pts.length < 3) return pts;
  const out: Stroke = [];
  for (let i = 0; i < pts.length; i++) {
    let x = 0;
    let y = 0;
    let c = 0;
    const a = Math.max(0, i - w);
    const b = Math.min(pts.length - 1, i + w);
    for (let k = a; k <= b; k++) {
      x += pts[k][0];
      y += pts[k][1];
      c++;
    }
    out.push([x / c, y / c]);
  }
  return out;
}

export const pathGens: Generator[] = [
  {
    id: "walk",
    name: "Random walk",
    group: "Paths",
    hint: "Smoothed random walks with a light pull toward the center, so they stay on the sheet.",
    params: [
      { key: "pfade", label: "Paths", min: 1, max: 12, step: 1, def: 3, integer: true },
      { key: "schritte", label: "Steps", min: 80, max: 1600, step: 20, def: 500, integer: true },
      { key: "ruhe", label: "Smoothing", min: 1, max: 24, step: 1, def: 8, integer: true },
      { key: "zug", label: "Pull to center", min: 0, max: 0.08, step: 0.002, def: 0.012 },
    ],
    draw: (p, rng) => {
      const paths = Math.round(param(p, "pfade", 3));
      const steps = Math.round(param(p, "schritte", 500));
      const win = Math.round(param(p, "ruhe", 8));
      const pull = param(p, "zug", 0.012);
      const strokes: Stroke[] = [];
      for (let k = 0; k < paths; k++) {
        let x = (rng() - 0.5) * 0.4;
        let y = (rng() - 0.5) * 0.4;
        const raw: Stroke = [[x, y]];
        for (let i = 0; i < steps; i++) {
          x += -pull * x + (rng() - 0.5) * 0.09;
          y += -pull * y + (rng() - 0.5) * 0.09;
          raw.push([x, y]);
        }
        strokes.push(smooth(raw, win));
      }
      return strokes;
    },
  },
  {
    id: "levyflight",
    name: "Lévy flight",
    group: "Paths",
    hint: "Mostly short steps, with rare long jumps. The path stays tied to the center.",
    params: [
      { key: "pfade", label: "Paths", min: 1, max: 8, step: 1, def: 2, integer: true },
      { key: "schritte", label: "Steps", min: 40, max: 600, step: 10, def: 180, integer: true },
      { key: "schwere", label: "Heaviness", min: 1.2, max: 3.2, step: 0.1, def: 1.8 },
      { key: "zug", label: "Pull to center", min: 0, max: 0.12, step: 0.002, def: 0.02 },
    ],
    draw: (p, rng) => {
      const paths = Math.round(param(p, "pfade", 2));
      const steps = Math.round(param(p, "schritte", 180));
      const mu = param(p, "schwere", 1.8);
      const pull = param(p, "zug", 0.02);
      const strokes: Stroke[] = [];
      for (let k = 0; k < paths; k++) {
        let x = (rng() - 0.5) * 0.2;
        let y = (rng() - 0.5) * 0.2;
        const pts: Stroke = [[x, y]];
        for (let i = 0; i < steps; i++) {
          const u = Math.max(1e-4, rng());
          const len = Math.min(0.55, 0.015 * Math.pow(u, -1 / mu));
          const ang = rng() * TAU;
          x += -pull * x + Math.cos(ang) * len;
          y += -pull * y + Math.sin(ang) * len;
          pts.push([x, y]);
        }
        strokes.push(pts);
      }
      return strokes;
    },
  },
  {
    id: "recaman",
    name: "Recamán",
    group: "Paths",
    hint: "Semicircles on the Recamán sequence. Each arc has the radius of that jump.",
    params: [{ key: "glieder", label: "Terms", min: 12, max: 240, step: 1, def: 72, integer: true }],
    draw: (p) => {
      const n = Math.round(param(p, "glieder", 72));
      const seen = new Set<number>([0]);
      const seq = [0];
      for (let k = 1; k <= n; k++) {
        const prev = seq[seq.length - 1];
        let next = prev - k;
        if (next < 0 || seen.has(next)) next = prev + k;
        seen.add(next);
        seq.push(next);
      }
      const strokes: Stroke[] = [];
      for (let i = 1; i < seq.length; i++) {
        const a = seq[i - 1];
        const b = seq[i];
        const dx = b - a;
        const radius = Math.abs(dx) / 2;
        if (radius === 0) continue;
        const cx = (a + b) / 2;
        const sign = i % 2 === 0 ? 1 : -1;
        const start = dx > 0 ? Math.PI : 0;
        const end = dx > 0 ? 0 : Math.PI;
        const steps = Math.max(8, Math.round(radius * 1.4));
        const pts: Stroke = [];
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const ang = start + (end - start) * t;
          pts.push([cx + radius * Math.cos(ang), sign * radius * Math.sin(ang)]);
        }
        strokes.push(pts);
      }
      return strokes;
    },
  },
  {
    id: "phyllo",
    name: "Phyllotaxis",
    group: "Paths",
    hint: "Sunflower spiral. 137.5° is the golden angle; small deviations dissolve the pattern.",
    params: [
      { key: "anzahl", label: "Seeds", min: 40, max: 800, step: 10, def: 280, integer: true },
      { key: "winkel", label: "Angle", min: 120, max: 160, step: 0.1, def: 137.5 },
      {
        key: "art",
        label: "Drawing",
        min: 0,
        max: 2,
        step: 1,
        def: 1,
        integer: true,
        names: ["Spiral", "Circles", "Strokes"],
      },
      { key: "groesse", label: "Dot size", min: 0.2, max: 1.6, step: 0.05, def: 0.7 },
    ],
    draw: (p) => {
      const n = Math.round(param(p, "anzahl", 280));
      const ang = (param(p, "winkel", 137.5) * Math.PI) / 180;
      const art = Math.round(param(p, "art", 1));
      const size = param(p, "groesse", 0.7);
      const pts: Stroke = [];
      for (let i = 1; i <= n; i++) {
        const r = Math.sqrt(i / n);
        const a = i * ang;
        pts.push([r * Math.cos(a), r * Math.sin(a)]);
      }
      if (art === 0) return [pts];
      const strokes: Stroke[] = [];
      const base = (size * 0.55) / Math.sqrt(n);
      for (const [x, y] of pts) {
        const r = Math.hypot(x, y);
        if (art === 1) {
          strokes.push(circle(x, y, base * (0.45 + r), Math.max(8, Math.round(10 + r * 8))));
        } else {
          const len = base * 3.2;
          const mag = r || 1;
          strokes.push([
            [x - (x / mag) * len, y - (y / mag) * len],
            [x + (x / mag) * len * 0.15, y + (y / mag) * len * 0.15],
          ]);
        }
      }
      return strokes;
    },
  },
  {
    id: "packing",
    name: "Circles",
    group: "Paths",
    hint: "Circles that do not overlap. The seed searches for a new packing, and the margin stays clear.",
    params: [
      { key: "versuche", label: "Tries", min: 40, max: 700, step: 10, def: 280, integer: true },
      { key: "min", label: "Smallest", min: 0.015, max: 0.12, step: 0.005, def: 0.03 },
      { key: "max", label: "Largest", min: 0.04, max: 0.28, step: 0.005, def: 0.14 },
    ],
    draw: (p, rng) => {
      const tries = Math.round(param(p, "versuche", 280));
      const minR = param(p, "min", 0.03);
      let maxR = param(p, "max", 0.14);
      if (maxR < minR) maxR = minR;
      const placed: { x: number; y: number; r: number }[] = [];
      for (let i = 0; i < tries && placed.length < 220; i++) {
        const t = rng();
        const r = minR + (maxR - minR) * t * t;
        const span = 1 - r;
        const x = -span + rng() * span * 2;
        const y = -span + rng() * span * 2;
        let ok = true;
        for (const c of placed) {
          const dx = c.x - x;
          const dy = c.y - y;
          if (dx * dx + dy * dy < (c.r + r) * (c.r + r) * 1.04) {
            ok = false;
            break;
          }
        }
        if (ok) placed.push({ x, y, r });
      }
      return placed.map((c) => circle(c.x, c.y, c.r, Math.max(12, Math.round(c.r * 90))));
    },
  },
];

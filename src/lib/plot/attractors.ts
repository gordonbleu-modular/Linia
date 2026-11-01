import { param } from "./geometry";
import type { Generator, Stroke, Vec } from "./types";

function project(x: number, y: number, z: number, ax: number, ay: number): Vec {
  const cx = Math.cos(ax);
  const sx = Math.sin(ax);
  const cy = Math.cos(ay);
  const sy = Math.sin(ay);
  const y1 = y * cx - z * sx;
  const z1 = y * sx + z * cx;
  const x2 = x * cy + z1 * sy;
  return [x2, y1];
}

function flow3(
  n: number,
  dt: number,
  state: number[],
  deriv: (s: number[]) => number[],
  ax: number,
  ay: number,
  warm: number,
): Stroke {
  const s = state.slice();
  const pts: Stroke = [];
  const total = n + warm;
  for (let i = 0; i < total; i++) {
    const d = deriv(s);
    let ok = true;
    for (let k = 0; k < s.length; k++) {
      s[k] += d[k] * dt;
      if (!Number.isFinite(s[k])) ok = false;
    }
    if (!ok) break;
    if (i >= warm) pts.push(project(s[0], s[1], s[2], ax, ay));
  }
  return pts;
}

/** Chaotic maps jump across the figure. Short ticks show the density without kilometres of travel. */
function orbitTicks(n: number, next: (x: number, y: number) => [number, number]): Stroke[] {
  let x = 0.1;
  let y = 0.1;
  const stride = Math.max(1, Math.round(n / 2800));
  const len = 0.055;
  const strokes: Stroke[] = [];
  for (let i = 0; i < n; i++) {
    const pair = next(x, y);
    x = pair[0];
    y = pair[1];
    if (i > 40 && i % stride === 0 && Number.isFinite(x) && Number.isFinite(y)) {
      const a = Math.sin(x * 12.9898 + y * 78.233) * Math.PI;
      const dx = Math.cos(a) * len;
      const dy = Math.sin(a) * len;
      strokes.push([
        [x - dx, y - dy],
        [x + dx, y + dy],
      ]);
    }
  }
  return strokes;
}

export const attractorGens: Generator[] = [
  {
    id: "lorenz",
    name: "Lorenz",
    group: "Attractors",
    hint: "The classic butterfly. Rho changes the wings; the angles only change the view.",
    params: [
      { key: "rho", label: "Rho", min: 12, max: 48, step: 0.5, def: 28 },
      { key: "schritte", label: "Steps", min: 1500, max: 14000, step: 100, def: 5000, integer: true },
      { key: "drehung", label: "Rotation", min: 0, max: 180, step: 0.5, def: 28 },
      { key: "neigung", label: "Tilt", min: -60, max: 60, step: 0.5, def: 18 },
    ],
    draw: (p) => {
      const rho = param(p, "rho", 28);
      const n = Math.round(param(p, "schritte", 5000));
      const ax = (param(p, "neigung", 18) * Math.PI) / 180;
      const ay = (param(p, "drehung", 28) * Math.PI) / 180;
      const sigma = 10;
      const beta = 8 / 3;
      const pts = flow3(
        n,
        0.006,
        [0.1, 0, 0],
        (s) => [sigma * (s[1] - s[0]), s[0] * (rho - s[2]) - s[1], s[0] * s[1] - beta * s[2]],
        ax,
        ay,
        250,
      );
      return pts.length > 1 ? [pts] : [];
    },
  },
  {
    id: "clifford",
    name: "Clifford",
    group: "Attractors",
    hint: "Short strokes where the orbit passes often. One continuous jump would send the plotter for kilometers.",
    params: [
      { key: "a", label: "a", min: -2.5, max: 2.5, step: 0.01, def: -1.4 },
      { key: "b", label: "b", min: -2.5, max: 2.5, step: 0.01, def: 1.6 },
      { key: "c", label: "c", min: -2.5, max: 2.5, step: 0.01, def: 1 },
      { key: "d", label: "d", min: -2.5, max: 2.5, step: 0.01, def: 0.7 },
      { key: "schritte", label: "Steps", min: 2000, max: 30000, step: 500, def: 8000, integer: true },
    ],
    draw: (p) => {
      const a = param(p, "a", -1.4);
      const b = param(p, "b", 1.6);
      const c = param(p, "c", 1);
      const d = param(p, "d", 0.7);
      const n = Math.round(param(p, "schritte", 8000));
      return orbitTicks(n, (x, y) => [Math.sin(a * y) + c * Math.cos(a * x), Math.sin(b * x) + d * Math.cos(b * y)]);
    },
  },
  {
    id: "dejong",
    name: "De Jong",
    group: "Attractors",
    hint: "A density of short strokes from Peter de Jong's map. The four constants are the whole picture.",
    params: [
      { key: "a", label: "a", min: -3, max: 3, step: 0.01, def: 1.4 },
      { key: "b", label: "b", min: -3, max: 3, step: 0.01, def: -2.3 },
      { key: "c", label: "c", min: -3, max: 3, step: 0.01, def: 2.4 },
      { key: "d", label: "d", min: -3, max: 3, step: 0.01, def: -2.1 },
      { key: "schritte", label: "Steps", min: 2000, max: 30000, step: 500, def: 8000, integer: true },
    ],
    draw: (p) => {
      const a = param(p, "a", 1.4);
      const b = param(p, "b", -2.3);
      const c = param(p, "c", 2.4);
      const d = param(p, "d", -2.1);
      const n = Math.round(param(p, "schritte", 8000));
      return orbitTicks(n, (x, y) => [Math.sin(a * y) - Math.cos(b * x), Math.sin(c * x) - Math.cos(d * y)]);
    },
  },
  {
    id: "aizawa",
    name: "Aizawa",
    group: "Attractors",
    hint: "A spherical loop with outliers. The shape parameter holds the attractor together.",
    params: [
      { key: "form", label: "Shape", min: 0.9, max: 0.99, step: 0.005, def: 0.95 },
      { key: "schritte", label: "Steps", min: 2000, max: 16000, step: 200, def: 7000, integer: true },
      { key: "drehung", label: "Rotation", min: 0, max: 180, step: 0.5, def: 24 },
      { key: "neigung", label: "Tilt", min: -70, max: 70, step: 0.5, def: 20 },
    ],
    draw: (p) => {
      const a = param(p, "form", 0.95);
      const n = Math.round(param(p, "schritte", 7000));
      const ax = (param(p, "neigung", 20) * Math.PI) / 180;
      const ay = (param(p, "drehung", 24) * Math.PI) / 180;
      const b = 0.7;
      const c = 0.6;
      const d = 3.5;
      const e = 0.25;
      const f = 0.1;
      const pts = flow3(
        n,
        0.01,
        [0.1, 0, 0],
        (s) => {
          const x = s[0];
          const y = s[1];
          const z = s[2];
          const dx = (z - b) * x - d * y;
          const dy = d * x + (z - b) * y;
          const dz = c + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x;
          return [dx, dy, dz];
        },
        ax,
        ay,
        200,
      );
      return pts.length > 1 ? [pts] : [];
    },
  },
  {
    id: "thomas",
    name: "Thomas",
    group: "Attractors",
    hint: "Cyclically coupled sine terms. Around 0.19 the familiar tangled orbit appears.",
    params: [
      { key: "b", label: "Damping", min: 0.05, max: 0.28, step: 0.005, def: 0.19 },
      { key: "schritte", label: "Steps", min: 2000, max: 16000, step: 200, def: 8000, integer: true },
      { key: "drehung", label: "Rotation", min: 0, max: 180, step: 0.5, def: 36 },
      { key: "neigung", label: "Tilt", min: -70, max: 70, step: 0.5, def: 22 },
    ],
    draw: (p) => {
      const b = param(p, "b", 0.19);
      const n = Math.round(param(p, "schritte", 8000));
      const ax = (param(p, "neigung", 22) * Math.PI) / 180;
      const ay = (param(p, "drehung", 36) * Math.PI) / 180;
      const pts = flow3(
        n,
        0.06,
        [0.1, 0, 0],
        (s) => [Math.sin(s[1]) - b * s[0], Math.sin(s[2]) - b * s[1], Math.sin(s[0]) - b * s[2]],
        ax,
        ay,
        100,
      );
      return pts.length > 1 ? [pts] : [];
    },
  },
];

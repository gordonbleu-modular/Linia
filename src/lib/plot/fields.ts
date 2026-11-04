import { fieldContours } from "./contour";
import { arc, circle, param } from "./geometry";
import { fbm } from "./noise";
import type { Generator, Stroke, Vec } from "./types";

const TAU = Math.PI * 2;

export const fieldGens: Generator[] = [
  {
    id: "flow",
    name: "Flow",
    group: "Fields",
    hint: "Streamlines follow a noise field. The seed fixes the field, so the lines stay reproducible.",
    params: [
      { key: "scale", label: "Scale", min: 0.6, max: 5, step: 0.1, def: 1.8 },
      { key: "dreh", label: "Rotation", min: 0.4, max: 6, step: 0.1, def: 2.4 },
      { key: "linien", label: "Lines", min: 8, max: 90, step: 1, def: 36, integer: true },
      { key: "schritte", label: "Steps", min: 20, max: 220, step: 2, def: 90, integer: true },
      { key: "spiegel", label: "Mirror", min: 0, max: 1, step: 1, def: 0, integer: true, names: ["off", "on"] },
    ],
    draw: (p, _rng, seed) => {
      const scale = param(p, "scale", 1.8);
      const turn = param(p, "dreh", 2.4);
      const lines = Math.round(param(p, "linien", 36));
      const steps = Math.round(param(p, "schritte", 90));
      const stepLen = 2.4 / steps;
      const strokes: Stroke[] = [];
      const cols = Math.ceil(Math.sqrt(lines));
      const rows = Math.ceil(lines / cols);
      let n = 0;
      for (let j = 0; j < rows && n < lines; j++) {
        for (let i = 0; i < cols && n < lines; i++) {
          n++;
          let x = -0.92 + ((i + 0.5) / cols) * 1.84;
          let y = -0.92 + ((j + 0.5) / rows) * 1.84;
          const jitter = (((seed + i * 17 + j * 31) % 100) / 100 - 0.5) * 0.08;
          x += jitter;
          y -= jitter;
          const pts: Stroke = [[x, y]];
          for (let s = 0; s < steps; s++) {
            const ang = fbm(x * scale + 2, y * scale - 1, seed, 4) * Math.PI * turn;
            x += Math.cos(ang) * stepLen;
            y += Math.sin(ang) * stepLen;
            if (x < -1.25 || x > 1.25 || y < -1.25 || y > 1.25) break;
            pts.push([x, y]);
          }
          if (pts.length > 3) strokes.push(pts);
        }
      }
      if (Math.round(param(p, "spiegel", 0)) === 1) {
        const extra = strokes.map((s) => s.map(([x, y]) => [-x, y] as Vec));
        strokes.push(...extra);
      }
      return strokes;
    },
  },
  {
    id: "vector",
    name: "Vector field",
    group: "Fields",
    hint: "Evenly spaced streamlines of a formula. Spacing keeps the pen from piling up.",
    params: [
      {
        key: "feld",
        label: "Field",
        min: 0,
        max: 4,
        step: 1,
        def: 0,
        integer: true,
        names: ["Waves", "Swirl", "Saddle", "Orbit", "Meander"],
      },
      { key: "freq", label: "Frequency", min: 0.4, max: 4, step: 0.05, def: 1.4 },
      { key: "bend", label: "Bend", min: 0.2, max: 2.2, step: 0.05, def: 0.9 },
      { key: "winkel", label: "Angle", min: 0, max: 180, step: 0.5, def: 18 },
      { key: "abstand", label: "Spacing", min: 0.04, max: 0.16, step: 0.005, def: 0.07 },
      { key: "laenge", label: "Length", min: 60, max: 320, step: 10, def: 160, integer: true },
    ],
    draw: (p) => {
      const kind = Math.max(0, Math.min(4, Math.round(param(p, "feld", 0))));
      const freq = param(p, "freq", 1.4);
      const bend = param(p, "bend", 0.9);
      const angle = (param(p, "winkel", 18) * Math.PI) / 180;
      const sep = Math.max(0.035, param(p, "abstand", 0.07));
      const maxLen = Math.round(param(p, "laenge", 160));
      const step = 0.011;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const unit = (x: number, y: number): Vec => {
        const l = Math.hypot(x, y) || 1;
        return [x / l, y / l];
      };
      const fieldAt = (x: number, y: number): Vec => {
        const xr = x * c - y * s;
        const yr = x * s + y * c;
        const f = freq * Math.PI;
        if (kind === 1) return unit(-yr, xr * bend + 0.2);
        if (kind === 2) return unit(Math.sin(f * yr), Math.cos(f * xr) * bend);
        if (kind === 3) {
          const r = Math.hypot(xr, yr) + 0.22;
          return unit(-yr / r + bend * 0.5, xr / r);
        }
        if (kind === 4) return unit(1, bend * Math.sin(f * xr) * Math.cos(f * yr * 0.6));
        return unit(1, bend * Math.sin(f * xr + Math.sin(f * yr * 0.45)));
      };
      const cell = sep * 0.55;
      const inv = 1 / cell;
      const keyOf = (x: number, y: number) => Math.floor((x + 2) * inv) * 8192 + Math.floor((y + 2) * inv);
      const taken = new Set<number>();
      const occupied = (x: number, y: number) => taken.has(keyOf(x, y));
      const trace = (x0: number, y0: number, dir: 1 | -1): Stroke => {
        const pts: Stroke = [];
        let x = x0;
        let y = y0;
        for (let i = 0; i < maxLen; i++) {
          if (x < -1.05 || x > 1.05 || y < -1.05 || y > 1.05) break;
          if (i > 4 && occupied(x, y)) break;
          pts.push([x, y]);
          const [vx, vy] = fieldAt(x, y);
          const [ux, uy] = fieldAt(x + vx * step * 0.5 * dir, y + vy * step * 0.5 * dir);
          x += ux * step * dir;
          y += uy * step * dir;
        }
        return pts;
      };
      const strokes: Stroke[] = [];
      const seeds: Vec[] = [];
      for (let y = -1; y <= 1.001; y += sep) {
        for (let x = -1; x <= 1.001; x += sep) seeds.push([x, y]);
      }
      for (const [sx, sy] of seeds) {
        if (strokes.length >= 80) break;
        if (occupied(sx, sy)) continue;
        const forward = trace(sx, sy, 1);
        const back = trace(sx, sy, -1);
        back.reverse();
        const line = back.length > 1 ? back.slice(0, -1).concat(forward) : forward;
        if (line.length < 40) continue;
        for (const [x, y] of line) taken.add(keyOf(x, y));
        strokes.push(line);
      }
      return strokes;
    },
  },
  {
    id: "topo",
    name: "Topography",
    group: "Fields",
    hint: "Contours of a noise landscape. A map, drawn from a formula.",
    params: [
      { key: "freq", label: "Frequency", min: 0.6, max: 4.5, step: 0.1, def: 1.7 },
      { key: "oktaven", label: "Octaves", min: 1, max: 6, step: 1, def: 4, integer: true },
      { key: "niveaus", label: "Levels", min: 4, max: 16, step: 1, def: 9, integer: true },
      { key: "raster", label: "Grid", min: 50, max: 160, step: 10, def: 100, integer: true },
    ],
    draw: (p, _rng, seed) => {
      const freq = param(p, "freq", 1.7);
      const octaves = Math.round(param(p, "oktaven", 4));
      const levelsN = Math.round(param(p, "niveaus", 9));
      const grid = Math.round(param(p, "raster", 100));
      const sampleAt = (x: number, y: number) => fbm(x * freq, y * freq, seed, octaves);
      const levels: number[] = [];
      for (let i = 1; i < levelsN; i++) levels.push(-0.82 + (1.64 * i) / levelsN);
      return fieldContours(grid, grid, sampleAt, levels);
    },
  },
  {
    id: "chladni",
    name: "Chladni",
    group: "Fields",
    hint: "Nodal lines of a square plate. n and m are the vibration modes.",
    params: [
      { key: "n", label: "Mode n", min: 1, max: 9, step: 0.1, def: 3 },
      { key: "m", label: "Mode m", min: 1, max: 9, step: 0.1, def: 4 },
      { key: "mix", label: "Mix", min: 0.2, max: 2, step: 0.02, def: 1 },
      { key: "baender", label: "Bands", min: 1, max: 5, step: 1, def: 1, integer: true },
      { key: "raster", label: "Grid", min: 60, max: 180, step: 10, def: 130, integer: true },
    ],
    draw: (p) => {
      const n = param(p, "n", 3);
      const m = param(p, "m", 4);
      const mix = param(p, "mix", 1);
      const bands = Math.round(param(p, "baender", 1));
      const grid = Math.round(param(p, "raster", 130));
      const sampleAt = (x: number, y: number) => {
        const u = (x + 1) / 2;
        const v = (y + 1) / 2;
        const a = Math.cos(n * Math.PI * u) * Math.cos(m * Math.PI * v);
        const b = Math.cos(m * Math.PI * u) * Math.cos(n * Math.PI * v);
        return a - mix * b;
      };
      const levels: number[] = [];
      if (bands <= 1) levels.push(0);
      else {
        const spread = 0.18;
        for (let k = 0; k < bands; k++) levels.push((k - (bands - 1) / 2) * spread);
      }
      return fieldContours(grid, grid, sampleAt, levels);
    },
  },
  {
    id: "interference",
    name: "Interference",
    group: "Fields",
    hint: "Stacked slices through a wave. The rows rise and fall with the amplitude.",
    params: [
      { key: "fx", label: "Frequency X", min: 1, max: 14, step: 0.05, def: 4 },
      { key: "fy", label: "Frequency Y", min: 1, max: 10, step: 0.05, def: 3 },
      { key: "zeilen", label: "Rows", min: 8, max: 80, step: 1, def: 36, integer: true },
      { key: "amp", label: "Amplitude", min: 0, max: 1.4, step: 0.02, def: 0.42 },
      { key: "phase", label: "Phase", min: 0, max: 360, step: 0.5, def: 20 },
    ],
    draw: (p) => {
      const fx = param(p, "fx", 4);
      const fy = param(p, "fy", 3);
      const rows = Math.round(param(p, "zeilen", 36));
      const amp = param(p, "amp", 0.42);
      const phase = (param(p, "phase", 20) * Math.PI) / 180;
      const cols = 140;
      const strokes: Stroke[] = [];
      for (let j = 0; j < rows; j++) {
        const v = rows === 1 ? 0.5 : j / (rows - 1);
        const pts: Stroke = [];
        for (let i = 0; i <= cols; i++) {
          const u = i / cols;
          const z =
            Math.sin(fx * u * TAU + phase) * Math.sin(fy * v * TAU) +
            0.35 * Math.sin(fx * 2 * u * TAU) * Math.sin((fy + 1) * v * TAU + phase);
          const y = (v * 2 - 1) * 0.92 + z * amp * 0.55;
          pts.push([u * 2 - 1, y]);
        }
        strokes.push(pts);
      }
      return strokes;
    },
  },
  {
    id: "dipole",
    name: "Field lines",
    group: "Fields",
    hint: "Field of a dipole. Lines run from the positive charge to the negative one, or out to infinity.",
    params: [
      { key: "abstand", label: "Separation", min: 0.15, max: 0.7, step: 0.01, def: 0.38 },
      { key: "linien", label: "Lines", min: 6, max: 36, step: 1, def: 16, integer: true },
      { key: "same", label: "Charge", min: 0, max: 1, step: 1, def: 0, integer: true, names: ["opposite", "same"] },
    ],
    draw: (p) => {
      const sep = param(p, "abstand", 0.38);
      const lines = Math.round(param(p, "linien", 16));
      const same = Math.round(param(p, "same", 0)) === 1;
      const charges: [number, number, number][] = [
        [-sep, 0, 1],
        [sep, 0, same ? 1 : -1],
      ];
      const field = (x: number, y: number): Vec => {
        let ex = 0;
        let ey = 0;
        for (const [cx, cy, q] of charges) {
          const dx = x - cx;
          const dy = y - cy;
          const r2 = dx * dx + dy * dy + 1e-4;
          const inv = q / (r2 * Math.sqrt(r2));
          ex += dx * inv;
          ey += dy * inv;
        }
        return [ex, ey];
      };
      const strokes: Stroke[] = [];
      const steps = 420;
      const h = 0.012;
      for (let i = 0; i < lines; i++) {
        const a = ((i + 0.5) / lines) * TAU;
        let x = -sep + Math.cos(a) * 0.045;
        let y = Math.sin(a) * 0.045;
        const pts: Stroke = [[x, y]];
        for (let s = 0; s < steps; s++) {
          const [ex, ey] = field(x, y);
          const m = Math.hypot(ex, ey) || 1e-9;
          x += (ex / m) * h;
          y += (ey / m) * h;
          if (Math.hypot(x - sep, y) < 0.04) {
            pts.push([x, y]);
            break;
          }
          if (Math.abs(x) > 1.35 || Math.abs(y) > 1.35) break;
          pts.push([x, y]);
        }
        if (pts.length > 2) strokes.push(pts);
      }
      return strokes;
    },
  },
  {
    id: "moire",
    name: "Moiré",
    group: "Fields",
    hint: "Two families of lines, slightly rotated or shifted. The beat appears only to the eye.",
    params: [
      {
        key: "art",
        label: "Kind",
        min: 0,
        max: 2,
        step: 1,
        def: 0,
        integer: true,
        names: ["Lines", "Circles", "Rays"],
      },
      { key: "linien", label: "Count", min: 6, max: 60, step: 1, def: 24, integer: true },
      { key: "winkel", label: "Angle", min: 1, max: 40, step: 0.1, def: 7 },
      { key: "versatz", label: "Offset", min: 0, max: 0.6, step: 0.01, def: 0.12 },
    ],
    draw: (p) => {
      const art = Math.round(param(p, "art", 0));
      const n = Math.round(param(p, "linien", 24));
      const rot = (param(p, "winkel", 7) * Math.PI) / 180;
      const offset = param(p, "versatz", 0.12);
      const strokes: Stroke[] = [];
      const rotP = (x: number, y: number): Vec => [x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)];
      if (art === 0) {
        for (let i = 0; i < n; i++) {
          const y = -1 + (2 * i) / Math.max(1, n - 1);
          strokes.push([
            [-1, y],
            [1, y],
          ]);
          const a = rotP(-1, y + offset * 0.15);
          const b = rotP(1, y + offset * 0.15);
          strokes.push([a, b]);
        }
      } else if (art === 1) {
        for (let i = 1; i <= n; i++) {
          const r = (i / n) * 1.05;
          strokes.push(circle(0, 0, r, 100));
          strokes.push(circle(offset, offset * 0.45, r, 100));
        }
      } else {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          strokes.push([
            [0, 0],
            [Math.cos(a), Math.sin(a)],
          ]);
          strokes.push([
            [offset, 0],
            [offset + Math.cos(a + rot), Math.sin(a + rot)],
          ]);
        }
      }
      return strokes;
    },
  },
  {
    id: "truchet",
    name: "Truchet",
    group: "Fields",
    hint: "Quarter-circles on a grid, placed by the seed. Together they become long meanders.",
    params: [
      { key: "raster", label: "Grid", min: 4, max: 22, step: 1, def: 10, integer: true },
      { key: "stoerung", label: "Noise", min: 0, max: 40, step: 1, def: 0, integer: true },
    ],
    draw: (p, rng) => {
      const n = Math.round(param(p, "raster", 10));
      const noise = param(p, "stoerung", 0) / 100;
      const strokes: Stroke[] = [];
      const seg = n > 14 ? 6 : 8;
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const flip = rng() < 0.5;
          const both = rng() < noise;
          const drawTile = (kind: boolean) => {
            const x = i;
            const y = j;
            if (kind) {
              strokes.push(arc(x, y + 1, 0.5, -Math.PI / 2, 0, seg));
              strokes.push(arc(x + 1, y, 0.5, Math.PI / 2, Math.PI, seg));
            } else {
              strokes.push(arc(x + 1, y + 1, 0.5, Math.PI, Math.PI * 1.5, seg));
              strokes.push(arc(x, y, 0.5, 0, Math.PI / 2, seg));
            }
          };
          drawTile(flip);
          if (both) drawTile(!flip);
        }
      }
      return strokes;
    },
  },
];

import { closureTurns, param, ratioTurns, sample } from "./geometry";
import type { Generator, Stroke } from "./types";

const TAU = Math.PI * 2;

export const curveGens: Generator[] = [
  {
    id: "guilloche",
    name: "Guilloché",
    group: "Curves",
    hint: "Interlaced rings, like a banknote. Each ring is one closed stroke.",
    params: [
      { key: "ringe", label: "Rings", min: 1, max: 16, step: 1, def: 8, integer: true },
      { key: "freq", label: "Frequency", min: 1, max: 42, step: 0.05, def: 13 },
      { key: "mod", label: "Modulation", min: 0, max: 70, step: 0.5, def: 22 },
      { key: "zweite", label: "Second wave", min: 1, max: 28, step: 0.05, def: 5 },
      { key: "phase", label: "Phase", min: 0, max: 360, step: 0.5, def: 24 },
      { key: "dichte", label: "Points", min: 240, max: 1800, step: 20, def: 720, integer: true },
    ],
    draw: (p) => {
      const rings = Math.round(param(p, "ringe", 8));
      const freq = param(p, "freq", 13);
      const zweite = param(p, "zweite", 5);
      const mod = param(p, "mod", 22) / 100;
      const phase0 = (param(p, "phase", 24) * Math.PI) / 180;
      const turns = closureTurns(freq, zweite, 10);
      const n = Math.min(3200, Math.round(param(p, "dichte", 720) * turns));
      const strokes: Stroke[] = [];
      for (let i = 0; i < rings; i++) {
        const base = 0.22 + (i / Math.max(1, rings - 1)) * 0.78;
        const amp = mod * 0.11 * (0.55 + 0.45 * (i / rings));
        const phase = phase0 + i * 0.41;
        const pts: Stroke = [];
        for (let k = 0; k <= n; k++) {
          const t = (k / n) * turns * TAU;
          const rho =
            base +
            amp * Math.sin(freq * t + phase) +
            amp * 0.42 * Math.sin(zweite * t - phase * 0.6);
          pts.push([rho * Math.cos(t), rho * Math.sin(t)]);
        }
        strokes.push(pts);
      }
      return strokes;
    },
  },
  {
    id: "hypotrochoid",
    name: "Hypotrochoid",
    group: "Curves",
    hint: "Inner spirograph: a circle rolls inside another. Whole radii close it; fractions keep it winding.",
    params: [
      { key: "R", label: "Fixed radius", min: 3, max: 24, step: 0.1, def: 12 },
      { key: "r", label: "Rolling radius", min: 0.5, max: 16, step: 0.1, def: 5 },
      { key: "d", label: "Pen", min: 0.2, max: 18, step: 0.1, def: 7.5 },
      { key: "dichte", label: "Detail", min: 8, max: 48, step: 1, def: 22, integer: true },
    ],
    draw: (p) => {
      const R = Math.max(0.5, param(p, "R", 12));
      const r = Math.max(0.4, param(p, "r", 5));
      const d = param(p, "d", 7.5);
      const turns = ratioTurns(R, r);
      const n = Math.min(10000, Math.round(turns * param(p, "dichte", 22) * 20));
      const k = (R - r) / r;
      return sample(n, (t) => {
        const th = t * turns * TAU;
        return [(R - r) * Math.cos(th) + d * Math.cos(k * th), (R - r) * Math.sin(th) - d * Math.sin(k * th)];
      });
    },
  },
  {
    id: "epitrochoid",
    name: "Epitrochoid",
    group: "Curves",
    hint: "The rolling circle runs outside the fixed ring. Related to cycloids and rosettes.",
    params: [
      { key: "R", label: "Fixed radius", min: 3, max: 24, step: 0.1, def: 8 },
      { key: "r", label: "Rolling radius", min: 0.5, max: 16, step: 0.1, def: 3 },
      { key: "d", label: "Pen", min: 0.2, max: 18, step: 0.1, def: 5 },
      { key: "dichte", label: "Detail", min: 8, max: 48, step: 1, def: 20, integer: true },
    ],
    draw: (p) => {
      const R = Math.max(0.5, param(p, "R", 8));
      const r = Math.max(0.4, param(p, "r", 3));
      const d = param(p, "d", 5);
      const turns = ratioTurns(R, r);
      const n = Math.min(10000, Math.round(turns * param(p, "dichte", 20) * 20));
      const k = (R + r) / r;
      return sample(n, (t) => {
        const th = t * turns * TAU;
        return [(R + r) * Math.cos(th) - d * Math.cos(k * th), (R + r) * Math.sin(th) - d * Math.sin(k * th)];
      });
    },
  },
  {
    id: "harmonograph",
    name: "Harmonograph",
    group: "Curves",
    hint: "Two damped pendulums. Close frequencies make figures that slowly decay.",
    params: [
      { key: "f1", label: "Frequency X", min: 1, max: 9, step: 0.01, def: 2 },
      { key: "f2", label: "Frequency Y", min: 1, max: 9, step: 0.01, def: 3 },
      { key: "detune", label: "Detune", min: 0, max: 0.4, step: 0.005, def: 0.02 },
      { key: "phase", label: "Phase", min: 0, max: 180, step: 0.5, def: 90 },
      { key: "decay", label: "Damping", min: 0, max: 0.08, step: 0.001, def: 0.012 },
      { key: "mix", label: "Second voice", min: 0, max: 1, step: 0.01, def: 0.45 },
      { key: "dauer", label: "Duration", min: 12, max: 160, step: 1, def: 70, integer: true },
    ],
    draw: (p) => {
      const f1 = param(p, "f1", 2);
      const f2 = param(p, "f2", 3);
      const detune = param(p, "detune", 0.02);
      const phase = (param(p, "phase", 90) * Math.PI) / 180;
      const decay = param(p, "decay", 0.012);
      const mix = param(p, "mix", 0.45);
      const dauer = param(p, "dauer", 70);
      const n = Math.round(dauer * 70);
      return sample(n, (u) => {
        const t = u * dauer;
        const e1 = Math.exp(-decay * t);
        const e2 = Math.exp(-decay * 0.72 * t);
        const x = Math.sin(f1 * t + phase) * e1 + mix * Math.sin((f1 + detune) * t) * e2;
        const y = Math.sin(f2 * t) * e1 + mix * Math.sin((f2 + detune * 1.4) * t + phase * 0.5) * e2;
        return [x, y];
      });
    },
  },
  {
    id: "lissajous",
    name: "Lissajous",
    group: "Curves",
    hint: "x and y oscillate at their own frequencies. Whole-number ratios close the curve.",
    params: [
      { key: "a", label: "Frequency X", min: 1, max: 12, step: 0.05, def: 3 },
      { key: "b", label: "Frequency Y", min: 1, max: 12, step: 0.05, def: 4 },
      { key: "phase", label: "Phase", min: 0, max: 180, step: 0.5, def: 30 },
      { key: "dichte", label: "Points", min: 200, max: 4000, step: 20, def: 1200, integer: true },
    ],
    draw: (p) => {
      const a = param(p, "a", 3);
      const b = param(p, "b", 4);
      const phase = (param(p, "phase", 30) * Math.PI) / 180;
      const turns = closureTurns(a, b, 10);
      const n = Math.min(6000, Math.round(param(p, "dichte", 1200) * turns));
      return sample(n, (t) => {
        const th = t * turns * TAU;
        return [Math.sin(a * th + phase), Math.sin(b * th)];
      });
    },
  },
  {
    id: "rose",
    name: "Rose",
    group: "Curves",
    hint: "Rhodonea r = cos(kθ). Integer k makes petals; half values make interlaced stars.",
    params: [
      { key: "k", label: "Petals k", min: 1, max: 16, step: 0.05, def: 5 },
      { key: "dichte", label: "Points", min: 200, max: 3000, step: 20, def: 900, integer: true },
    ],
    draw: (p) => {
      const k = param(p, "k", 5);
      const turns = closureTurns(k, 1, 10);
      const n = Math.min(5000, Math.round(param(p, "dichte", 900) * turns));
      return sample(n, (u) => {
        const th = u * turns * TAU;
        const r = Math.cos(k * th);
        return [r * Math.cos(th), r * Math.sin(th)];
      });
    },
  },
  {
    id: "maurer",
    name: "Maurer-Rose",
    group: "Curves",
    hint: "Connects points of a rose at a fixed angle step. One stroke, often a star.",
    params: [
      { key: "n", label: "Rose n", min: 1, max: 20, step: 0.05, def: 6 },
      { key: "d", label: "Step °", min: 1, max: 180, step: 0.1, def: 71 },
      { key: "huelle", label: "Envelope", min: 0, max: 1, step: 1, def: 1, integer: true, names: ["off", "on"] },
    ],
    draw: (p) => {
      const n = param(p, "n", 6);
      const d = Math.max(0.1, param(p, "d", 71));
      const pts: Stroke = [];
      let count = 360;
      for (let k = 1; k <= 720; k++) {
        if (Math.abs((k * d) / 360 - Math.round((k * d) / 360)) < 0.012) {
          count = k;
          break;
        }
      }
      for (let k = 0; k <= count; k++) {
        const th = ((k * d) * Math.PI) / 180;
        const r = Math.sin(n * th);
        pts.push([r * Math.cos(th), r * Math.sin(th)]);
      }
      const strokes: Stroke[] = [pts];
      if (Math.round(param(p, "huelle", 1)) === 1) {
        const rose: Stroke = [];
        for (let k = 0; k <= 720; k++) {
          const th = (k / 720) * TAU;
          const r = Math.sin(n * th);
          rose.push([r * Math.cos(th), r * Math.sin(th)]);
        }
        strokes.push(rose);
      }
      return strokes;
    },
  },
  {
    id: "superformula",
    name: "Superformula",
    group: "Curves",
    hint: "Gielis formula. A few exponents shift between star, flower, and polygon.",
    params: [
      { key: "m", label: "Symmetry", min: 1, max: 16, step: 0.05, def: 6 },
      { key: "n1", label: "n1", min: 0.2, max: 12, step: 0.1, def: 0.6 },
      { key: "n2", label: "n2", min: 0.2, max: 20, step: 0.1, def: 1.2 },
      { key: "n3", label: "n3", min: 0.2, max: 20, step: 0.1, def: 1.4 },
      { key: "dichte", label: "Points", min: 180, max: 2000, step: 20, def: 720, integer: true },
    ],
    draw: (p) => {
      const m = param(p, "m", 6);
      const n1 = Math.max(0.2, param(p, "n1", 0.6));
      const n2 = Math.max(0.2, param(p, "n2", 1.2));
      const n3 = Math.max(0.2, param(p, "n3", 1.4));
      const turns = closureTurns(m, 1, 10);
      const n = Math.min(4800, Math.round(param(p, "dichte", 720) * turns));
      return sample(n, (u) => {
        const phi = u * turns * TAU;
        const c = Math.abs(Math.cos((m * phi) / 4));
        const s = Math.abs(Math.sin((m * phi) / 4));
        const inner = Math.pow(c, n2) + Math.pow(s, n3);
        let r = inner > 0 ? Math.pow(inner, -1 / n1) : 0;
        if (!Number.isFinite(r)) r = 0;
        r = Math.min(r, 6);
        return [r * Math.cos(phi), r * Math.sin(phi)];
      });
    },
  },
  {
    id: "torus",
    name: "Torus knot",
    group: "Curves",
    hint: "A knot on a torus, slightly tilted. Extra strands lie beside each other like a rope.",
    params: [
      { key: "p", label: "Turns p", min: 1, max: 12, step: 0.05, def: 3 },
      { key: "q", label: "Turns q", min: 1, max: 12, step: 0.05, def: 2 },
      { key: "rohr", label: "Tube", min: 0.15, max: 0.7, step: 0.01, def: 0.38 },
      { key: "adern", label: "Strands", min: 1, max: 8, step: 1, def: 1, integer: true },
      { key: "neigung", label: "Tilt", min: 0, max: 80, step: 0.5, def: 32 },
      { key: "dichte", label: "Points", min: 200, max: 2400, step: 20, def: 900, integer: true },
    ],
    draw: (p) => {
      const P = Math.max(0.5, param(p, "p", 3));
      const Q = Math.max(0.5, param(p, "q", 2));
      const tube = param(p, "rohr", 0.38);
      const veins = Math.round(param(p, "adern", 1));
      const tilt = (param(p, "neigung", 32) * Math.PI) / 180;
      const n = Math.round(param(p, "dichte", 900));
      const R = 1;
      const strokes: Stroke[] = [];
      const turns = closureTurns(P, Q, 8);
      for (let v = 0; v < veins; v++) {
        const ph = (v / veins) * TAU;
        const pts: Stroke = [];
        const count = n * Math.max(P, Q);
        for (let i = 0; i <= count; i++) {
          const t = (i / count) * TAU * turns;
          const x = (R + tube * Math.cos(Q * t + ph)) * Math.cos(P * t);
          const y = (R + tube * Math.cos(Q * t + ph)) * Math.sin(P * t);
          const z = tube * Math.sin(Q * t + ph);
          const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
          pts.push([x, y2]);
        }
        strokes.push(pts);
      }
      return strokes;
    },
  },
  {
    id: "epicycle",
    name: "Epicycles",
    group: "Curves",
    hint: "A sum of circular motions: a closed Fourier figure. More harmonics, finer bays.",
    params: [
      { key: "h", label: "Harmonics", min: 2, max: 14, step: 1, def: 6, integer: true },
      { key: "decay", label: "Falloff", min: 0.35, max: 1.8, step: 0.05, def: 0.85 },
      { key: "skew", label: "Coupling", min: 1, max: 4, step: 0.05, def: 2 },
      { key: "phase", label: "Phase", min: 0, max: 180, step: 0.5, def: 40 },
      { key: "dichte", label: "Points", min: 300, max: 2400, step: 20, def: 1000, integer: true },
    ],
    draw: (p) => {
      const h = Math.round(param(p, "h", 6));
      const decay = param(p, "decay", 0.85);
      const skew = param(p, "skew", 2);
      const phase = (param(p, "phase", 40) * Math.PI) / 180;
      const turns = closureTurns(skew, 1, 8);
      const n = Math.min(5000, Math.round(param(p, "dichte", 1000) * turns));
      return sample(n, (u) => {
        const t = u * turns * TAU;
        let x = 0;
        let y = 0;
        for (let k = 1; k <= h; k++) {
          const amp = Math.pow(k, -decay);
          const pk = phase * k * 0.45;
          x += amp * Math.cos(k * t + pk);
          y += amp * Math.sin(k * skew * t + pk * 0.35);
        }
        return [x, y];
      });
    },
  },
  {
    id: "butterfly",
    name: "Butterfly",
    group: "Curves",
    hint: "The transcendental butterfly curve. More revolutions fill the wings.",
    params: [
      { key: "umlaeufe", label: "Revolutions", min: 1, max: 24, step: 0.1, def: 12 },
      { key: "dichte", label: "Detail", min: 20, max: 120, step: 1, def: 60, integer: true },
    ],
    draw: (p) => {
      const turns = Math.max(1, param(p, "umlaeufe", 12));
      const n = turns * Math.round(param(p, "dichte", 60)) * 4;
      return sample(n, (u) => {
        const t = u * turns * TAU;
        const r =
          Math.exp(Math.sin(t)) -
          2 * Math.cos(4 * t) +
          Math.pow(Math.sin((2 * t - Math.PI) / 24), 5);
        return [r * Math.cos(t), r * Math.sin(t)];
      });
    },
  },
  {
    id: "spiral",
    name: "Spiral",
    group: "Curves",
    hint: "Archimedean spiral, optionally counter-wound. Arm spacing stays constant.",
    params: [
      { key: "windungen", label: "Turns", min: 2, max: 40, step: 0.1, def: 14 },
      { key: "arme", label: "Arms", min: 1, max: 6, step: 1, def: 2, integer: true },
      { key: "dichte", label: "Detail", min: 12, max: 48, step: 1, def: 24, integer: true },
    ],
    draw: (p) => {
      const turns = Math.max(0.5, param(p, "windungen", 14));
      const arms = Math.round(param(p, "arme", 2));
      const per = Math.round(param(p, "dichte", 24));
      const strokes: Stroke[] = [];
      for (let a = 0; a < arms; a++) {
        const shift = (a / arms) * TAU;
        const n = turns * per;
        const pts: Stroke = [];
        for (let i = 0; i <= n; i++) {
          const th = (i / per) * TAU + shift;
          const r = th / (turns * TAU);
          pts.push([r * Math.cos(th), r * Math.sin(th)]);
        }
        strokes.push(pts);
      }
      return strokes;
    },
  },
  {
    id: "klassiker",
    name: "Classics",
    group: "Curves",
    hint: "Closed curves from classical geometry, from astroid to lemniscate.",
    params: [
      {
        key: "form",
        label: "Curve",
        min: 0,
        max: 6,
        step: 1,
        def: 1,
        integer: true,
        names: ["Astroid", "Cardioid", "Nephroid", "Deltoid", "Lemniscate", "Folium", "Limaçon"],
      },
      { key: "b", label: "Limaçon b", min: 0.2, max: 1.6, step: 0.02, def: 0.55 },
      { key: "dichte", label: "Points", min: 120, max: 1600, step: 20, def: 600, integer: true },
    ],
    draw: (p) => {
      const form = Math.round(param(p, "form", 1));
      const b = param(p, "b", 0.55);
      const n = Math.round(param(p, "dichte", 600));
      if (form === 0) {
        return sample(n, (u) => {
          const t = u * TAU;
          return [Math.cos(t) ** 3, Math.sin(t) ** 3];
        });
      }
      if (form === 1) {
        return sample(n, (u) => {
          const t = u * TAU;
          const r = 1 - Math.cos(t);
          return [r * Math.cos(t), r * Math.sin(t)];
        });
      }
      if (form === 2) {
        return sample(n, (u) => {
          const t = u * TAU;
          return [3 * Math.cos(t) - Math.cos(3 * t), 3 * Math.sin(t) - Math.sin(3 * t)];
        });
      }
      if (form === 3) {
        return sample(n, (u) => {
          const t = u * TAU;
          return [2 * Math.cos(t) + Math.cos(2 * t), 2 * Math.sin(t) - Math.sin(2 * t)];
        });
      }
      if (form === 4) {
        return sample(n, (u) => {
          const t = u * TAU;
          const s = Math.sin(t);
          const denom = 1 + s * s;
          return [(Math.cos(t) / denom) * 1.4, ((s * Math.cos(t)) / denom) * 1.4];
        });
      }
      if (form === 5) {
        return sample(n, (u) => {
          const t = 0.08 + u * 18;
          const t3 = t * t * t;
          const denom = 1 + t3;
          return [(3 * t) / denom, (3 * t * t) / denom];
        });
      }
      return sample(n, (u) => {
        const t = u * TAU;
        const r = b + Math.cos(t);
        return [r * Math.cos(t), r * Math.sin(t)];
      });
    },
  },
];

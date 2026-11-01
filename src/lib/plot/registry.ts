import { attractorGens } from "./attractors";
import { curveGens } from "./curves";
import { fieldGens } from "./fields";
import { fractalGens } from "./fractals";
import { mulberry32, roundToStep, sanitize } from "./geometry";
import { pathGens } from "./paths";
import type { Generator } from "./types";

export const GENERATORS: Generator[] = [
  ...curveGens,
  ...fractalGens,
  ...fieldGens,
  ...pathGens,
  ...attractorGens,
];

const BY_ID = new Map(GENERATORS.map((g) => [g.id, g]));

export function getGenerator(id: string): Generator {
  return BY_ID.get(id) ?? GENERATORS[0];
}

export function defaults(gen: Generator): Record<string, number> {
  const out: Record<string, number> = {};
  for (const spec of gen.params) out[spec.key] = spec.def;
  return out;
}

export function pickParams(gen: Generator, params: Record<string, number>): Record<string, number> {
  const out = defaults(gen);
  for (const spec of gen.params) {
    const v = params[spec.key];
    if (typeof v === "number" && Number.isFinite(v)) {
      const clamped = Math.min(spec.max, Math.max(spec.min, v));
      out[spec.key] = roundToStep(clamped, spec.step);
    }
  }
  return out;
}

export function randomize(gen: Generator, rnd: () => number = Math.random): Record<string, number> {
  const out: Record<string, number> = {};
  for (const spec of gen.params) {
    const steps = Math.max(1, Math.round((spec.max - spec.min) / spec.step));
    const k = Math.round(rnd() * steps);
    out[spec.key] = roundToStep(spec.min + k * spec.step, spec.step);
  }
  return out;
}

export function renderGenerator(gen: Generator, params: Record<string, number>, seed: number) {
  const safeSeed = Math.round(seed) || 1;
  return sanitize(gen.draw(pickParams(gen, params), mulberry32(safeSeed), safeSeed));
}

const SEEDED = new Set(["flow", "topo", "truchet", "walk", "levyflight", "packing"]);

export function usesSeed(id: string): boolean {
  return SEEDED.has(id);
}

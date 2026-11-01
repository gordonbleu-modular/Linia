export type Vec = [number, number];
export type Stroke = Vec[];

export type GroupId = "Curves" | "Fractals" | "Fields" | "Paths" | "Attractors";

export const GROUPS: GroupId[] = ["Curves", "Fractals", "Fields", "Paths", "Attractors"];

export type ParamSpec = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
  integer?: boolean;
  names?: string[];
};

export type Generator = {
  id: string;
  name: string;
  group: GroupId;
  hint: string;
  params: ParamSpec[];
  draw: (params: Record<string, number>, rng: () => number, seed: number) => Stroke[];
};

export type PaperId = "a6" | "a5" | "a4" | "a3" | "quadrat" | "karte";

export type Paper = { id: PaperId; label: string; w: number; h: number };

export const PAPERS: Paper[] = [
  { id: "a6", label: "A6", w: 105, h: 148 },
  { id: "a5", label: "A5", w: 148, h: 210 },
  { id: "a4", label: "A4", w: 210, h: 297 },
  { id: "a3", label: "A3", w: 297, h: 420 },
  { id: "quadrat", label: "Square", w: 200, h: 200 },
  { id: "karte", label: "Card", w: 100, h: 150 },
];

export type Ink = { id: string; label: string; hex: string };

export const INKS: Ink[] = [
  { id: "tinte", label: "Ink", hex: "#1c1612" },
  { id: "sepia", label: "Sepia", hex: "#6e432c" },
  { id: "indigo", label: "Indigo", hex: "#1e3a5f" },
  { id: "zinnober", label: "Vermilion", hex: "#8f2d2a" },
  { id: "wald", label: "Forest", hex: "#234033" },
];

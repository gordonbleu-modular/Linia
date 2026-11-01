import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Dices, Download, RectangleHorizontal, RectangleVertical, RotateCcw, Shuffle, Spline } from "lucide-react";
import { downloadText, toHpgl, toSvg } from "@/lib/plot/export";
import { formatLength, formatParam, roundToStep, strokesToD, travelToD, layoutDrawing } from "@/lib/plot/geometry";
import { defaults, GENERATORS, getGenerator, pickParams, randomize, renderGenerator, usesSeed } from "@/lib/plot/registry";
import { GROUPS, INKS, PAPERS, type GroupId, type PaperId } from "@/lib/plot/types";

const STORAGE = "linia.v1";

type Memory = {
  genId?: string;
  params?: Record<string, number>;
  seed?: number;
  paperId?: PaperId;
  landscape?: boolean;
  margin?: number;
  strokeMm?: number;
  smooth?: number;
  ink?: string;
  showTravel?: boolean;
  sortPaths?: boolean;
  marks?: boolean;
};

export function Studio() {
  const [genId, setGenId] = useState("guilloche");
  const [params, setParams] = useState<Record<string, number>>(() => defaults(getGenerator("guilloche")));
  const [seed, setSeed] = useState(1847);
  const [paperId, setPaperId] = useState<PaperId>("a4");
  const [landscape, setLandscape] = useState(false);
  const [margin, setMargin] = useState(14);
  const [strokeMm, setStrokeMm] = useState(0.35);
  const [smooth, setSmooth] = useState(0.06);
  const [inkId, setInkId] = useState("tinte");
  const [showTravel, setShowTravel] = useState(false);
  const [sortPaths, setSortPaths] = useState(true);
  const [marks, setMarks] = useState(false);
  const [query, setQuery] = useState("");
  const [browseGroup, setBrowseGroup] = useState<GroupId>("Curves");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const data = JSON.parse(raw) as Memory;
        if (data.genId && GENERATORS.some((g) => g.id === data.genId)) {
          const next = getGenerator(data.genId);
          setGenId(next.id);
          setParams(pickParams(next, data.params ?? {}));
          setBrowseGroup(next.group);
        }
        if (typeof data.seed === "number" && Number.isFinite(data.seed)) setSeed(Math.round(data.seed));
        if (data.paperId && PAPERS.some((p) => p.id === data.paperId)) setPaperId(data.paperId);
        if (typeof data.landscape === "boolean") setLandscape(data.landscape);
        if (typeof data.margin === "number") setMargin(clampNum(data.margin, 6, 30));
        if (typeof data.strokeMm === "number") setStrokeMm(clampNum(data.strokeMm, 0.15, 1.2));
        if (typeof data.smooth === "number") setSmooth(clampNum(data.smooth, 0, 0.5));
        if (data.ink && INKS.some((i) => i.id === data.ink)) setInkId(data.ink);
        if (typeof data.showTravel === "boolean") setShowTravel(data.showTravel);
        if (typeof data.sortPaths === "boolean") setSortPaths(data.sortPaths);
        if (typeof data.marks === "boolean") setMarks(data.marks);
      }
    } catch {
      /* ignore broken memory */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload: Memory = {
      genId,
      params,
      seed,
      paperId,
      landscape,
      margin,
      strokeMm,
      smooth,
      ink: inkId,
      showTravel,
      sortPaths,
      marks,
    };
    localStorage.setItem(STORAGE, JSON.stringify(payload));
  }, [ready, genId, params, seed, paperId, landscape, margin, strokeMm, smooth, inkId, showTravel, sortPaths, marks]);

  const gen = getGenerator(genId);
  const snapshot = useMemo(() => ({ genId, params, seed }), [genId, params, seed]);
  const deferred = useDeferredValue(snapshot);
  const shown = getGenerator(deferred.genId);
  const paper = PAPERS.find((p) => p.id === paperId) ?? PAPERS[2];
  const sheetW = landscape ? paper.h : paper.w;
  const sheetH = landscape ? paper.w : paper.h;
  const ink = INKS.find((item) => item.id === inkId) ?? INKS[0];

  const raw = useMemo(
    () => renderGenerator(shown, deferred.params, deferred.seed),
    [shown, deferred.params, deferred.seed],
  );
  const layout = useMemo(
    () => layoutDrawing(raw, { w: sheetW, h: sheetH, margin, smooth, sort: sortPaths, marks }),
    [raw, sheetW, sheetH, margin, smooth, sortPaths, marks],
  );
  const d = useMemo(() => strokesToD(layout.strokes), [layout.strokes]);
  const travel = useMemo(() => (showTravel ? travelToD(layout.strokes) : ""), [showTravel, layout.strokes]);

  useEffect(() => {
    document.querySelectorAll(`[data-gen="${genId}"]`).forEach((el) => {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }, [genId]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? GENERATORS.filter((g) => `${g.name} ${g.group}`.toLowerCase().includes(q))
    : GENERATORS;
  const mobileGens = GENERATORS.filter((g) => g.group === browseGroup);

  function choose(id: string) {
    const next = getGenerator(id);
    setGenId(next.id);
    setParams(defaults(next));
    setBrowseGroup(next.group);
  }

  function surprise() {
    const next = GENERATORS[Math.floor(Math.random() * GENERATORS.length)] ?? gen;
    setGenId(next.id);
    setParams(randomize(next));
    setSeed(1 + Math.floor(Math.random() * 99998));
    setBrowseGroup(next.group);
  }

  function describe(): string {
    const bits = [
      shown.name,
      `Seed ${deferred.seed}`,
      `${paper.label} ${landscape ? "landscape" : "portrait"}`,
      `Margin ${margin} mm`,
      ...shown.params.map((spec) => `${spec.label} ${formatParam(deferred.params[spec.key] ?? spec.def, spec)}`),
    ];
    return bits.join(" · ");
  }

  function exportSvg() {
    const svg = toSvg({
      strokes: layout.strokes,
      w: sheetW,
      h: sheetH,
      strokeMm,
      title: `Linia — ${shown.name}`,
      desc: describe(),
    });
    downloadText(`linia-${shown.id}-${deferred.seed}.svg`, svg, "image/svg+xml");
  }

  function exportHpgl() {
    const text = toHpgl(layout.strokes, sheetH);
    downloadText(`linia-${shown.id}-${deferred.seed}.hpgl`, text, "application/octet-stream");
  }

  const longPlot = layout.points > 28000 || layout.penDown > 6000;

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-desk text-fg">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-panel px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <Spline className="size-5 text-brass" strokeWidth={1.6} aria-hidden="true" />
          <div>
            <h1 className="font-display text-xl leading-none tracking-wide">Linia</h1>
            <p className="text-xs text-mist">Pen plotter studio</p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="paper">
            Paper size
          </label>
          <select
            id="paper"
            value={paperId}
            onChange={(e) => setPaperId(e.target.value as PaperId)}
            className="h-11 rounded-md border border-line bg-desk px-3 text-base"
          >
            {PAPERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-pressed={landscape}
            aria-label={landscape ? "Portrait" : "Landscape"}
            title={landscape ? "Portrait" : "Landscape"}
            onClick={() => setLandscape((v) => !v)}
            className="inline-flex size-11 items-center justify-center rounded-md border border-line"
          >
            {landscape ? <RectangleHorizontal className="size-5" /> : <RectangleVertical className="size-5" />}
          </button>
          <button
            type="button"
            onClick={exportSvg}
            disabled={layout.strokes.length === 0}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brass px-4 text-sm font-medium text-desk disabled:opacity-40"
          >
            <Download className="size-4" aria-hidden="true" />
            SVG
          </button>
          <button
            type="button"
            onClick={exportHpgl}
            disabled={layout.strokes.length === 0}
            title="For older plotters"
            className="inline-flex h-11 items-center rounded-full border border-line px-3 text-sm disabled:opacity-40"
          >
            HPGL
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="order-2 hidden min-h-0 w-60 shrink-0 border-line bg-panel lg:order-1 lg:flex lg:flex-col lg:border-r">
          <div className="shrink-0 space-y-2 p-3">
            <button
              type="button"
              onClick={surprise}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-line text-sm"
            >
              <Dices className="size-4 text-brass" aria-hidden="true" />
              Surprise me
            </button>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search motifs"
              aria-label="Search motifs"
              className="h-11 w-full rounded-md border border-line bg-desk px-3 text-base placeholder:text-mist"
            />
          </div>
          <nav aria-label="Motifs" className="min-h-0 flex-1 overflow-y-auto pb-4">
            {GROUPS.map((group) => {
              const items = filtered.filter((g) => g.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <h2 className="sticky top-0 bg-panel px-3 py-2 text-xs tracking-widest text-mist uppercase">
                    {group}
                  </h2>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      data-gen={item.id}
                      aria-pressed={item.id === genId}
                      onClick={() => choose(item.id)}
                      className={`flex h-10 w-full items-center border-l-2 px-3 text-left text-sm ${
                        item.id === genId
                          ? "border-brass bg-brass/15 text-fg"
                          : "border-transparent text-mist"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              );
            })}
            {filtered.length === 0 && <p className="px-3 py-4 text-sm text-mist">No motif by that name.</p>}
          </nav>
        </aside>

        <section className="relative order-1 flex min-h-0 min-w-0 flex-[1.25] flex-col lg:order-2 lg:flex-1">
          <div className="flex min-h-0 flex-1 p-3 sm:p-5">
            <div className="stage-slot h-full w-full">
              <div className="flex h-full w-full items-center justify-center">
                <div
                  className="sheet"
                  style={{
                    width: `min(100cqw, calc(100cqh * ${sheetW} / ${sheetH}))`,
                    aspectRatio: `${sheetW} / ${sheetH}`,
                  }}
                >
                  <svg
                    viewBox={`0 0 ${sheetW} ${sheetH}`}
                    className="block h-full w-full"
                    role="img"
                    aria-label={`${shown.name}, ${layout.strokes.length} paths`}
                  >
                    <rect
                      x={margin}
                      y={margin}
                      width={Math.max(0, sheetW - margin * 2)}
                      height={Math.max(0, sheetH - margin * 2)}
                      fill="none"
                      stroke="rgba(28,22,18,0.13)"
                      strokeWidth={0.25}
                    />
                    {showTravel && travel ? (
                      <path
                        d={travel}
                        fill="none"
                        stroke="rgba(28,22,18,0.28)"
                        strokeWidth={0.18}
                        strokeDasharray="1.2 1.4"
                      />
                    ) : null}
                    <path
                      d={d}
                      fill="none"
                      stroke={ink.hex}
                      strokeWidth={strokeMm}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {layout.strokes.length === 0 ? (
                      <text
                        x={sheetW / 2}
                        y={sheetH / 2}
                        textAnchor="middle"
                        fill="#1c1612"
                        fontSize={Math.min(sheetW, sheetH) * 0.045}
                        fontFamily="Outfit, sans-serif"
                      >
                        No line
                      </text>
                    ) : null}
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <p className="pointer-events-none absolute inset-x-0 bottom-1 hidden justify-center px-4 text-center text-xs text-mist tabular-nums lg:flex">
            {shown.name} · {layout.strokes.length.toLocaleString("en-US")} paths · {formatLength(layout.penDown)}{" "}
            pen
          </p>

          <div className="shrink-0 border-t border-line bg-panel lg:hidden">
            <div className="flex gap-2 overflow-x-auto px-3 py-2">
              {GROUPS.map((group) => (
                <button
                  key={group}
                  type="button"
                  aria-pressed={browseGroup === group}
                  onClick={() => setBrowseGroup(group)}
                  className={
                    browseGroup === group
                      ? "h-10 shrink-0 rounded-full bg-brass px-3 text-sm text-desk"
                      : "h-10 shrink-0 rounded-full border border-line px-3 text-sm text-mist"
                  }
                >
                  {group}
                </button>
              ))}
              <button
                type="button"
                onClick={surprise}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-sm"
              >
                <Dices className="size-4 text-brass" aria-hidden="true" />
                Random
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto px-3 pb-2">
              {mobileGens.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-gen={item.id}
                  aria-pressed={item.id === genId}
                  onClick={() => choose(item.id)}
                  className={
                    item.id === genId
                      ? "h-10 shrink-0 rounded-full bg-fg px-3 text-sm text-desk"
                      : "h-10 shrink-0 rounded-full border border-line px-3 text-sm text-fg"
                  }
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="order-3 min-h-0 flex-1 overflow-y-auto border-t border-line bg-panel lg:w-96 lg:flex-none lg:border-t-0 lg:border-l">
          <div className="space-y-5 p-4 pb-8">
            <div>
              <h2 className="font-display text-2xl leading-tight text-balance">{gen.name}</h2>
              <p className="mt-1 text-sm text-pretty text-mist">{gen.hint}</p>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-sm">Seed</span>
                <span className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={999999}
                    value={seed}
                    aria-label="Seed"
                    onChange={(e) => setSeed(clampNum(Math.round(Number(e.target.value) || 1), 1, 999999))}
                    className="h-11 min-w-0 flex-1 rounded-md border border-line bg-desk px-3 text-base tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setSeed(1 + Math.floor(Math.random() * 99998))}
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm"
                  >
                    <Shuffle className="size-4" aria-hidden="true" />
                    New
                  </button>
                </span>
              </label>
              <p className="text-xs text-pretty text-mist">
                {usesSeed(gen.id)
                  ? "The seed fixes the randomness and the field. The same number draws the same sheet."
                  : "This motif is fixed. Vary rerolls the controls; the seed does not change it."}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setParams(randomize(gen));
                    setSeed(1 + Math.floor(Math.random() * 99998));
                  }}
                  className="h-11 flex-1 rounded-md border border-line text-sm"
                >
                  Vary
                </button>
                <button
                  type="button"
                  onClick={() => setParams(defaults(gen))}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-line text-sm"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Reset
                </button>
              </div>
            </div>

            <div className="space-y-1 border-t border-line pt-4">
              {gen.params.map((spec) => (
                <Range
                  key={spec.key}
                  label={spec.label}
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={params[spec.key] ?? spec.def}
                  display={formatParam(params[spec.key] ?? spec.def, spec)}
                  onChange={(value) => setParams((prev) => ({ ...prev, [spec.key]: value }))}
                />
              ))}
            </div>

            <div className="space-y-3 border-t border-line pt-4">
              <h3 className="text-xs tracking-widest text-mist uppercase">Sheet</h3>
              <Range
                label="Margin"
                min={6}
                max={30}
                step={1}
                value={margin}
                display={`${Math.round(margin)} mm`}
                onChange={setMargin}
              />
              <Range
                label="Stroke"
                min={0.15}
                max={1.2}
                step={0.05}
                value={strokeMm}
                display={`${strokeMm.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mm`}
                onChange={setStrokeMm}
              />
              <Range
                label="Smoothing"
                min={0}
                max={0.45}
                step={0.01}
                value={smooth}
                display={smooth === 0 ? "off" : `${smooth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mm`}
                onChange={setSmooth}
              />
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span>Ink</span>
                  <span className="text-brass">{ink.label}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Ink">
                  {INKS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={item.id === inkId}
                      aria-label={item.label}
                      onClick={() => setInkId(item.id)}
                      className={`size-11 rounded-full border-2 ${item.id === inkId ? "border-brass" : "border-line"}`}
                      style={{ background: item.hex }}
                    />
                  ))}
                </div>
              </div>
              <Toggle on={showTravel} label="Travel moves" onClick={() => setShowTravel((v) => !v)} />
              <Toggle on={sortPaths} label="Sort paths" onClick={() => setSortPaths((v) => !v)} />
              <Toggle on={marks} label="Crop marks" onClick={() => setMarks((v) => !v)} />
            </div>

            <div className="space-y-1 border-t border-line pt-4 text-sm">
              <Stat label="Paths" value={layout.strokes.length.toLocaleString("en-US")} />
              <Stat label="Points" value={layout.points.toLocaleString("en-US")} />
              <Stat label="Pen down" value={formatLength(layout.penDown)} />
              <Stat label="Pen up" value={formatLength(layout.penUp)} />
              {longPlot ? (
                <p className="pt-2 text-pretty text-mist">
                  Long plot. Fewer points, or a little smoothing, shortens the time on the machine.
                </p>
              ) : null}
              <p className="pt-2 text-pretty text-xs text-mist">
                SVG and HPGL are in millimeters, lines only, black. Ink is for the preview — the plotter draws
                with whichever pen is loaded.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Range({
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  onChange: (value: number) => void;
}) {
  const id = `slider-${label.replace(/\s+/g, "-")}`;
  return (
    <label htmlFor={id} className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-brass">{display}</span>
      </span>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(roundToStep(Number(e.target.value), step))}
      />
    </label>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-11 w-full items-center justify-between rounded-md border px-3 text-sm ${
        on ? "border-brass bg-brass/15 text-fg" : "border-line text-mist"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{on ? "on" : "off"}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-mist">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function clampNum(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

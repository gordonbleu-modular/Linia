import type { Stroke } from "./types";
import { strokesToD } from "./geometry";

export function toSvg(opt: {
  strokes: Stroke[];
  w: number;
  h: number;
  strokeMm: number;
  title: string;
  desc: string;
}): string {
  const d = strokesToD(opt.strokes, 2);
  const stroke = Math.max(0.05, opt.strokeMm).toFixed(2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${opt.w}mm" height="${opt.h}mm" viewBox="0 0 ${opt.w} ${opt.h}">
  <title>${escapeXml(opt.title)}</title>
  <desc>${escapeXml(opt.desc)}</desc>
  <g fill="none" stroke="#000000" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
    <path d="${d}"/>
  </g>
</svg>
`;
}

export function toHpgl(strokes: Stroke[], heightMm: number): string {
  const unit = 40;
  const lines: string[] = ["IN;", "SP1;"];
  const fmt = (x: number, y: number) => `${Math.round(x * unit)},${Math.round((heightMm - y) * unit)}`;
  for (const stroke of strokes) {
    if (stroke.length < 2) continue;
    lines.push(`PU${fmt(stroke[0][0], stroke[0][1])};`);
    let chunk: string[] = [];
    const flush = (penDown: boolean) => {
      if (chunk.length === 0) return;
      lines.push(`${penDown ? "PD" : "PU"}${chunk.join(",")};`);
      chunk = [];
    };
    for (let i = 1; i < stroke.length; i++) {
      chunk.push(fmt(stroke[i][0], stroke[i][1]));
      if (chunk.length >= 12) flush(true);
    }
    flush(true);
  }
  lines.push("PU;", "SP0;");
  return lines.join("\n");
}

function escapeXml(value: string): string {
  const amp = "&" + "amp;";
  const lt = "&" + "lt;";
  const gt = "&" + "gt;";
  const quot = "&" + "quot;";
  return value.replaceAll("&", amp).replaceAll("<", lt).replaceAll(">", gt).replaceAll('"', quot);
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

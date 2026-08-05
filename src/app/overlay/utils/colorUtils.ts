/** Presets del selector de color */
export const COLOR_PRESETS = [
  "#ffffff", "#e4e4e7", "#a1a1aa", "#52525b", "#27272a", "#101012", "#000000",
  "#ff9a5c", "#ff4a4a", "#fb7185", "#fbbf24", "#34d399", "#38bdf8", "#a970ff", "#53fc18",
];

export const CHECKER_BG =
  "repeating-conic-gradient(#3f3f46 0% 25%, #18181b 0% 50%) 0 0 / 8px 8px";

/** Parsea cualquier formato de color a hex + alpha (0–1). */
export function parseColor(value: string): { hex: string; alpha: number } {
  const v = value.trim().toLowerCase();
  if (!v || v === "transparent") return { hex: "#000000", alpha: 0 };
  let m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) return { hex: `#${m[1]}`, alpha: 1 };
  m = /^#([0-9a-f]{8})$/i.exec(v);
  if (m)
    return {
      hex: `#${m[1].slice(0, 6)}`,
      alpha: Math.round((parseInt(m[1].slice(6, 8), 16) / 255) * 100) / 100,
    };
  m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(v);
  if (m) {
    const to2 = (n: number) =>
      Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0");
    let a = 1;
    if (m[4] !== undefined)
      a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return {
      hex: `#${to2(+m[1])}${to2(+m[2])}${to2(+m[3])}`,
      alpha: Math.round(Math.min(1, Math.max(0, a)) * 100) / 100,
    };
  }
  return { hex: "#ffffff", alpha: 1 };
}

export function inferKindFromUrl(url: string): import("@/types/overlay").OverlayAssetKind {
  if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url)) return "audio";
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return "video";
  if (/\.gif(\?|$)/i.test(url)) return "gif";
  return "image";
}

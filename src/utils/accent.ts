/**
 * Accent colour utilities.
 * Converts a hex colour into the full set of CSS variables the app uses.
 */

const STORAGE_KEY = "rawenchat_accent_color";
export const DEFAULT_ACCENT = "#ff9a5c";

/** Parse hex → {r,g,b} */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/** Lighten hex by mixing toward white */
function lighten(hex: string, amount = 0.15): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb.r + (255 - rgb.r) * amount);
  const g = Math.round(rgb.g + (255 - rgb.g) * amount);
  const b = Math.round(rgb.b + (255 - rgb.b) * amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Determine if accent is light (use dark text) or dark (use light text) */
function contrastText(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000000";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? "#1a1a1a" : "#ffffff";
}

export function applyAccent(hex: string): void {
  if (typeof document === "undefined") return;
  const rgb = hexToRgb(hex);
  if (!rgb) return;

  const hover = lighten(hex, 0.12);
  const { r, g, b } = rgb;
  const root = document.documentElement;

  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-hover", hover);
  root.style.setProperty("--accent-muted", `rgba(${r},${g},${b},0.15)`);
  root.style.setProperty("--accent-border", `rgba(${r},${g},${b},0.3)`);
  root.style.setProperty("--accent-text", contrastText(hex));
}

export function loadAndApplyAccent(): void {
  const saved =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null;
  applyAccent(saved ?? DEFAULT_ACCENT);
}

export function saveAccent(hex: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, hex);
  }
  applyAccent(hex);
}

export function getAccent(): string {
  if (typeof localStorage !== "undefined") {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT;
  }
  return DEFAULT_ACCENT;
}

export const ACCENT_PRESETS = [
  { label: "Naranja",  hex: "#ff9a5c" },
  { label: "Azul",     hex: "#60a5fa" },
  { label: "Violeta",  hex: "#a78bfa" },
  { label: "Verde",    hex: "#34d399" },
  { label: "Rosa",     hex: "#f472b6" },
  { label: "Rojo",     hex: "#f87171" },
  { label: "Cyan",     hex: "#22d3ee" },
  { label: "Amarillo", hex: "#fbbf24" },
] as const;

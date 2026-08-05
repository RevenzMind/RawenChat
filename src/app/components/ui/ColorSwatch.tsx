"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevron } from "./icons";

export const COLOR_PRESETS = [
  "#ffffff", "#e4e4e7", "#a1a1aa", "#52525b", "#27272a", "#101012", "#000000",
  "#ff9a5c", "#ff4a4a", "#fb7185", "#fbbf24", "#34d399", "#38bdf8", "#a970ff", "#53fc18",
];

export const CHECKER_BG = "repeating-conic-gradient(#3f3f46 0% 25%, #18181b 0% 50%) 0 0 / 8px 8px";

// Parsea cualquier formato de color a hex + alpha (0–1)
export function parseColor(value: string): { hex: string; alpha: number } {
  const v = value.trim().toLowerCase();
  if (!v || v === "transparent") return { hex: "#000000", alpha: 0 };
  let m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) return { hex: `#${m[1]}`, alpha: 1 };
  m = /^#([0-9a-f]{8})$/i.exec(v);
  if (m) return { hex: `#${m[1].slice(0, 6)}`, alpha: Math.round((parseInt(m[1].slice(6, 8), 16) / 255) * 100) / 100 };
  m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(v);
  if (m) {
    const to2 = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0");
    let a = 1;
    if (m[4] !== undefined) a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { hex: `#${to2(+m[1])}${to2(+m[2])}${to2(+m[3])}`, alpha: Math.round(Math.min(1, Math.max(0, a)) * 100) / 100 };
  }
  return { hex: "#ffffff", alpha: 1 };
}

export function ColorSwatch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const isTransparent = !value || value === "transparent";
  const { hex: parsedHex, alpha: parsedAlpha } = parseColor(value);
  const hexValue = parsedHex;
  const alphaPct = Math.round(parsedAlpha * 100);

  // Aplica un alpha nuevo preservando el color actual
  function applyAlpha(pct: number) {
    const a = Math.min(100, Math.max(0, pct)) / 100;
    if (a >= 1) { onChange(parsedHex); return; }
    const r = parseInt(parsedHex.slice(1, 3), 16);
    const g = parseInt(parsedHex.slice(3, 5), 16);
    const b = parseInt(parsedHex.slice(5, 7), 16);
    onChange(`rgba(${r}, ${g}, ${b}, ${a})`);
  }

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const popW = 232;
      const popH = 250;
      let left = r.right - popW;
      if (left < 8) left = 8;
      let top = r.bottom + 6;
      if (top + popH > window.innerHeight - 8) top = Math.max(8, r.top - popH - 6);
      setPos({ top, left });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = (e: Event) => {
      if (popRef.current && e.target instanceof Node && popRef.current.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="flex h-7 w-full items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-1.5 transition-colors hover:border-[var(--accent-border)]"
      >
        <span
          className="h-4 w-4 shrink-0 rounded-[3px] border border-white/15"
          style={{ background: isTransparent ? CHECKER_BG : value }}
        />
        <span className="min-w-0 flex-1 truncate text-left font-mono text-[11px] text-[var(--text-secondary)]">
          {value || "transparent"}
        </span>
        <IconChevron open={open} className="h-3 w-3 text-[var(--text-muted)]" />
      </button>

      {open && (
        <div
          ref={popRef}
          className="fixed z-[9998] w-[232px] space-y-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Selector libre nativo camuflado como tile */}
          <label
            className="relative block h-9 w-full cursor-pointer overflow-hidden rounded-md border border-[var(--border)] transition-colors hover:border-[var(--accent-border)]"
            style={{ background: CHECKER_BG }}
            title="Selector de color libre"
          >
            <span
              className="absolute inset-0"
              style={{ background: isTransparent ? "transparent" : value, opacity: 0.9 }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/90 mix-blend-difference">
              Selector libre
            </span>
            <input
              type="color"
              value={hexValue}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>

          <div className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-[10px] text-[var(--text-muted)]">Alpha</span>
            <input
              type="range"
              min={0}
              max={100}
              value={alphaPct}
              onChange={(e) => applyAlpha(Number(e.target.value))}
              className="min-w-0 flex-1 accent-[var(--accent)]"
            />
            <span className="w-9 shrink-0 text-right font-mono text-[10px] text-[var(--text-secondary)]">{alphaPct}%</span>
          </div>

          <div className="grid grid-cols-8 gap-1">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => onChange(c)}
                className={`h-5 w-full rounded-[4px] border transition-transform hover:scale-110 ${
                  value.toLowerCase() === c ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-white/15"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              className="no-spinner min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 font-mono text-[11px] text-white focus:border-[var(--accent-border)] focus:outline-none"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#rrggbb o rgba(...)"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => onChange("transparent")}
              title="Transparente"
              className={`h-7 w-7 shrink-0 rounded-md border transition-colors ${
                isTransparent ? "border-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--accent-border)]"
              }`}
              style={{ background: CHECKER_BG }}
            />
          </div>
        </div>
      )}
    </>
  );
}

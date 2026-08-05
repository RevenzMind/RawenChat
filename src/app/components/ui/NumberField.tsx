"use client";

import { useState } from "react";

// Input numérico sin spinners nativos, con stepper ▲▼ y teclado
export function NumberField({ value, onChange, min, className = "" }: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => (min !== undefined ? Math.max(min, n) : n);

  function commit() {
    if (draft !== null && draft.trim() !== "") {
      const n = Number(draft);
      if (Number.isFinite(n)) onChange(clamp(Math.round(n)));
    }
    setDraft(null);
  }

  function nudge(delta: number, shift: boolean) {
    onChange(clamp(Math.round(value) + delta * (shift ? 10 : 1)));
  }

  return (
    <div className={`flex items-center rounded-md border border-[var(--border)] bg-[var(--card)] transition-colors focus-within:border-[var(--accent-border)] ${className}`}>
      <input
        type="number"
        className="no-spinner w-full min-w-0 bg-transparent px-2 py-1 font-mono text-xs text-white focus:outline-none"
        value={draft ?? Math.round(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "ArrowUp") { e.preventDefault(); nudge(1, e.shiftKey); }
          if (e.key === "ArrowDown") { e.preventDefault(); nudge(-1, e.shiftKey); }
        }}
      />
      <div className="flex shrink-0 flex-col gap-px pr-1">
        <button type="button" tabIndex={-1} onClick={(e) => nudge(1, e.shiftKey)}
          className="px-0.5 leading-none text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">
          <svg width="7" height="5" viewBox="0 0 8 5" fill="currentColor"><path d="M4 0l4 5H0z" /></svg>
        </button>
        <button type="button" tabIndex={-1} onClick={(e) => nudge(-1, e.shiftKey)}
          className="px-0.5 leading-none text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">
          <svg width="7" height="5" viewBox="0 0 8 5" fill="currentColor"><path d="M4 5L0 0h8z" /></svg>
        </button>
      </div>
    </div>
  );
}

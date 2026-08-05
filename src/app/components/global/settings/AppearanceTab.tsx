"use client";

import { ACCENT_PRESETS } from "@/utils/accent";
import { Field, SectionTitle } from "./DevicesTab";
import { ResetConfigButton } from "./ResetConfigButton";

interface AppearanceTabProps {
  accentHex: string;
  onChange: (hex: string) => void;
  onResetConfig?: () => void;
}

export function AppearanceTab({ accentHex, onChange, onResetConfig }: AppearanceTabProps) {
  return (
    <div className="space-y-5">
      <SectionTitle>Apariencia</SectionTitle>
      <Field label="Color de acento">
        <div className="flex flex-wrap gap-2 pt-1">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.hex}
              type="button"
              title={p.label}
              onClick={() => onChange(p.hex)}
              className="w-8 h-8 rounded-md border-2 transition-all hover:scale-105"
              style={{
                background: p.hex,
                borderColor: accentHex === p.hex ? "#fff" : "transparent",
                boxShadow: accentHex === p.hex ? `0 0 0 1px ${p.hex}` : "none",
              }}
            />
          ))}
          <label
            className="w-8 h-8 rounded-md border border-[var(--border)] overflow-hidden cursor-pointer hover:scale-105 transition-transform"
            title="Color personalizado"
          >
            <input
              type="color"
              value={accentHex}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="w-full h-full -mt-8 rounded-md border border-[var(--border)]"
              style={{ background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)" }}
            />
          </label>
        </div>
        <div className="flex items-center gap-2 mt-3 px-3 py-2.5 rounded-md border border-[var(--border)] bg-[var(--card)]">
          <div className="w-5 h-5 rounded-md shrink-0" style={{ background: accentHex }} />
          <span className="text-xs font-mono text-[var(--text-secondary)]">{accentHex}</span>
        </div>
      </Field>

      <ResetConfigButton onResetComplete={onResetConfig} />
    </div>
  );
}

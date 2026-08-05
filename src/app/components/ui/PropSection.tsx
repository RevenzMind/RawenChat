import type { ReactNode } from "react";

// Sección con punto accent y título, usada en los paneles del editor
export function PropSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 pt-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />
        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function PanelHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />
      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{title}</span>
      {typeof count === "number" && (
        <span className="ml-auto rounded-md bg-[var(--elevated)] px-1.5 py-px font-mono text-[10px] text-[var(--text-muted)]">
          {count}
        </span>
      )}
    </div>
  );
}

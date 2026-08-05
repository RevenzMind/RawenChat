import { ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  inline?: boolean;
  compact?: boolean;
  children: ReactNode;
}

export function Field({ label, hint, inline = false, compact = false, children }: FieldProps) {
  if (inline) {
    const labelClass = compact
      ? "text-[11px] text-[var(--text-muted)] shrink-0"
      : "text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap";
    return (
      <div className="flex items-center justify-between gap-2">
        <span className={labelClass}>{label}</span>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    );
  }

  const labelClass = compact
    ? "text-[10px] font-medium text-[var(--text-muted)]"
    : "text-xs font-medium text-[var(--text-secondary)]";

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={labelClass}>{label}</span>
        {hint && <span className="text-[10px] text-[var(--text-muted)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// Variante compacta por defecto en los paneles del editor de overlays
export default function PanelField({ label, children, inline = false }: {
  label: string; children: ReactNode; inline?: boolean;
}) {
  return (
    <Field label={label} inline={inline} compact>
      {children}
    </Field>
  );
}

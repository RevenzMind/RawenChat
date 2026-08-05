import { Button, Field as UiField } from "@/app/components/ui";

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

export function PropSection({ title, children }: { title: string; children: React.ReactNode }) {
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

export function Field({
  label,
  children,
  inline = false,
}: {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <UiField label={label} inline={inline} compact>
      {children}
    </UiField>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-1.5">{children}</div>;
}

export function PanelDivider() {
  return <div className="border-t border-[var(--border)] my-2" />;
}

export function Btn({
  children,
  onClick,
  danger = false,
  full = false,
  accent = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  full?: boolean;
  accent?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={accent ? "accent" : "ghost"}
      size="sm"
      danger={danger}
      full={full}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

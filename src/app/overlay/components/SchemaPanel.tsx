"use client";

import type { OverlayWidget } from "@/types/overlay";
import type { WidgetPropField } from "../widgetRegistry";
import { getWidgetDefinition } from "../widgetRegistry";
import Dropdown from "@/app/components/global/Dropdown";
import { Field, PanelDivider, PropSection } from "./ui-primitives";
import { NumberField } from "./NumberField";

/**
 * Campo de propiedades genérico: renderiza cualquier campo declarativo del
 * registro (widgetRegistry.ts) y escribe sobre `widget.data[key]`.
 */
function SchemaFieldInput({
  w,
  upW,
  field,
}: {
  w: OverlayWidget;
  upW: (fn: (w: OverlayWidget) => OverlayWidget) => void;
  field: WidgetPropField;
}) {
  const data = w.data as Record<string, unknown>;
  const set = (value: unknown) =>
    upW((v) => ({ ...v, data: { ...v.data, [field.key]: value } }) as unknown as typeof v);

  switch (field.type) {
    case "text": {
      const value = (data[field.key] as string | null) ?? "";
      return (
        <Field label={field.label}>
          <input
            className={`amoled-input !py-1 text-xs ${field.mono ? "font-mono" : ""}`}
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => set(field.nullable ? (e.target.value || null) : e.target.value)}
          />
        </Field>
      );
    }
    case "number":
      return (
        <Field label={field.label}>
          <NumberField value={Number(data[field.key] ?? 0)} onChange={(v) => set(v)} />
        </Field>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            className="rawen-checkbox"
            checked={Boolean(data[field.key])}
            onChange={(e) => set(e.target.checked)}
          />
          {field.label}
        </label>
      );
    case "select":
      return (
        <Field label={field.label}>
          <Dropdown
            compact
            options={field.options}
            value={String(data[field.key] ?? field.options[0]?.value ?? "")}
            onChange={(value) => set(value)}
          />
        </Field>
      );
    case "list": {
      const items = Array.isArray(data[field.key]) ? (data[field.key] as string[]) : [];
      return (
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">{field.label}</span>
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                className="amoled-input !py-1 text-xs flex-1"
                value={item}
                placeholder={`${field.itemPlaceholder ?? "Item"} ${i + 1}`}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  set(next);
                }}
              />
              <button
                type="button"
                onClick={() => set(items.filter((_, j) => j !== i))}
                className="shrink-0 text-[var(--text-muted)] hover:text-red-300 transition-colors text-[11px] px-1"
              >✕</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set([...items, ""])}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-[5px] border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-border)] transition-colors text-[10px]"
          >
            <span className="text-[var(--accent)]">+</span> Añadir
          </button>
        </div>
      );
    }
  }
}

/** Panel de propiedades generado a partir de la definición del registro. */
export function SchemaPanel({
  w,
  upW,
}: {
  w: OverlayWidget;
  upW: (fn: (w: OverlayWidget) => OverlayWidget) => void;
}) {
  const def = getWidgetDefinition(w.kind);
  return (
    <>
      <PanelDivider />
      <PropSection title={def.sectionTitle ?? def.label}>
        {def.fields?.map((field) => (
          <SchemaFieldInput key={field.key} w={w} upW={upW} field={field} />
        ))}
        {def.hint && (
          <div className="text-[10px] leading-relaxed text-[var(--text-muted)] px-1">{def.hint}</div>
        )}
      </PropSection>
    </>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ControlBox from "../components/controlbox";
import { OverlayCanvas } from "./OverlayCanvas";
import { getSelectedWidget, useOverlayEditorStore } from "./useOverlayEditorStore";
// Camera streaming is handled globally by CameraStreamBridge in page.tsx
// so OBS keeps receiving frames even when this editor tab is not open.
import {
  OVERLAY_CANVAS_PRESETS,
  OVERLAY_FONT_OPTIONS,
  DEFAULT_CUSTOM_WIDGET_CODE,
} from "@/constants/overlay";
import {
  getWidgetDefinition,
  widgetNeedsAssets,
  WIDGET_KIND_ORDER,
  type ConnectionNeed,
  type WidgetPropField,
} from "./widgetRegistry";
import { readLastFmConnection, LASTFM_CONNECTION_CHANGED_EVENT } from "@/utils/lastfm";
import { readTwitchAuth, TWITCH_AUTH_CHANGED_EVENT } from "@/utils/twitch";
import { ALERT_EVENT_LABELS, DEFAULT_ALERT_TEMPLATES, sanitizeAlertData, sendTestAlert } from "@/utils/alerts";
import { useOverlayAlerts } from "@/hooks";
import type { AlertEventKind } from "@/types/overlay";
import type { OverlayAsset, OverlayAssetKind, OverlaySceneConfig, OverlayWidget, OverlayWidgetKind } from "@/types/overlay";
import {
  createOverlayAsset,
  fileToDataUrl,
  getAssetById,
  getOverlayLiveUrl,
  inferAssetKind,
  isOverlayBridgeAvailable,
  OVERLAY_SESSION_CHANGED_EVENT,
} from "@/utils/overlay";
import { getFromStorage, saveToStorage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";
import { useCustomRenderableComponent, DEFAULT_COMPONENT_CODE } from "@/hooks";
import { useSessionPlatform } from "@/hooks";
import { DEFAULT_HEADER_CODE } from "@/utils/widgets";
import { Button, Field as UiField } from "@/app/components/ui";
import Dropdown from "@/app/components/global/Dropdown";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

function iconAttrs(className = "h-3.5 w-3.5") {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
}

function IconX({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function IconChevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg {...iconAttrs(className)} className={`${className ?? "h-3.5 w-3.5"} transition-transform duration-200 ${open ? "" : "-rotate-90"}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PanelHeading({ title, count }: { title: string; count?: number }) {
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

function PropSection({ title, children }: { title: string; children: React.ReactNode }) {
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

function Field({ label, children, inline = false }: { label: string; children: React.ReactNode; inline?: boolean }) {
  return (
    <UiField label={label} inline={inline} compact>
      {children}
    </UiField>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-1.5">{children}</div>;
}

function PanelDivider() {
  return <div className="border-t border-[var(--border)] my-2" />;
}

function Btn({ children, onClick, danger = false, full = false, accent = false }: {
  children: React.ReactNode; onClick?: () => void; danger?: boolean; full?: boolean; accent?: boolean;
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

/** Presets del selector de color */
const COLOR_PRESETS = [
  "#ffffff", "#e4e4e7", "#a1a1aa", "#52525b", "#27272a", "#101012", "#000000",
  "#ff9a5c", "#ff4a4a", "#fb7185", "#fbbf24", "#34d399", "#38bdf8", "#a970ff", "#53fc18",
];

const CHECKER_BG = "repeating-conic-gradient(#3f3f46 0% 25%, #18181b 0% 50%) 0 0 / 8px 8px";

/** Parsea cualquier formato de color a hex + alpha (0–1). */
function parseColor(value: string): { hex: string; alpha: number } {
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

function ColorSwatch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

          {/* Alpha */}
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

          {/* Presets */}
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

          {/* Hex + transparente */}
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

/** Input numérico pulido: sin spinners nativos, con stepper ▲▼ y teclado. */
function NumberField({ value, onChange, min, className = "" }: {
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

function inferKindFromUrl(url: string): OverlayAssetKind {
  if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url)) return "audio";
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return "video";
  if (/\.gif(\?|$)/i.test(url)) return "gif";
  return "image";
}

interface OverlayEditorClientProps { embedded?: boolean; }

function AssetThumb({ asset, selected, onSelect, onRemove }: {
  asset: OverlayAsset; selected: boolean; onSelect: () => void; onRemove?: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/rawenchat-asset-id", asset.id); e.dataTransfer.effectAllowed = "copy"; }}
      onClick={onSelect}
      className={`group relative rounded-[5px] border overflow-hidden cursor-grab active:cursor-grabbing transition-colors ${
        selected ? "border-[var(--accent)]" : "border-[var(--border)]"
      }`}
    >
      {asset.kind === "video" ? (
        <video src={asset.src} className="h-12 w-full object-cover" muted playsInline />
      ) : asset.kind === "audio" ? (
        <div className="h-12 w-full bg-black/30 flex items-center justify-center text-[var(--text-muted)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>
        </div>
      ) : (
        <img src={asset.thumbnailSrc || asset.src} alt={asset.name} className="h-12 w-full object-cover" />
      )}
      <div className="px-1 py-0.5 bg-[var(--card)] truncate text-[9px] text-white/70">{asset.name}</div>
      {onRemove && (
        <button type="button" title={`Eliminar "${asset.name}"`}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-0.5 right-0.5 flex items-center justify-center h-4 w-4 rounded bg-black/70 text-white/70 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      )}
    </div>
  );
}

/** Popup para elegir asset desde props: subir de PC o usar uno existente. */
function AssetPickerPopup({ title, accept, assets, value, onPick, onClose }: {
  title: string;
  accept: string;
  assets: OverlayAsset[];
  value: string | null;
  onPick: (id: string | null) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { addAsset } = useOverlayEditorStore();

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const kind = inferAssetKind(file);
    const dataUrl = await fileToDataUrl(file);
    let finalSrc = dataUrl;
    try {
      const saved = await window.electron?.saveOverlayAsset(file.name, dataUrl);
      if (saved?.url) finalSrc = saved.url;
    } catch {}
    const asset = createOverlayAsset({ name: file.name, kind, src: finalSrc, thumbnailSrc: finalSrc });
    addAsset(asset);
    onPick(asset.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[360px] max-h-[70vh] flex flex-col rounded-md border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{title}</div>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="p-3 space-y-3 overflow-y-auto rawen-scrollbar">
          <div className="flex gap-1.5">
            <Btn accent full onClick={() => fileRef.current?.click()}>Elegir de PC</Btn>
            <input ref={fileRef} type="file" accept={accept} className="hidden"
              onChange={(e) => { void onFile(e.target.files); e.target.value = ""; }} />
            <Btn full onClick={() => { onPick(null); onClose(); }}>Ninguno</Btn>
          </div>
          {assets.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {assets.map((a) => (
                <AssetThumb key={a.id} asset={a} selected={a.id === value}
                  onSelect={() => { onPick(a.id); onClose(); }} />
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-[var(--text-muted)] text-center py-4">
              Sin assets todavía — sube uno desde tu PC.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Botón plano que muestra el asset actual y abre el popup de selección. */
function AssetPickerButton({ asset, placeholder, onClick }: {
  asset?: OverlayAsset | null;
  placeholder: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-2 rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-xs text-white hover:border-white/30 transition-colors">
      {asset ? (
        <>
          {asset.kind === "video" ? (
            <video src={asset.src} className="h-6 w-10 rounded object-cover shrink-0" muted playsInline />
          ) : asset.kind === "audio" ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-[var(--text-muted)]"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" /></svg>
          ) : (
            <img src={asset.thumbnailSrc || asset.src} alt={asset.name} className="h-6 w-10 rounded object-cover shrink-0" />
          )}
          <span className="truncate">{asset.name}</span>
        </>
      ) : (
        <span className="text-[var(--text-muted)]">{placeholder}</span>
      )}
    </button>
  );
}

function PropsPanel({
  selectedWidget, scene, visualAssets, audioAssets, upW, bringForward, sendBackward, duplicateWidget, removeWidget,
}: {
  selectedWidget: OverlayWidget;
  scene: Parameters<typeof getAssetById>[0];
  visualAssets: OverlayAsset[];
  audioAssets: OverlayAsset[];
  upW: (fn: (w: OverlayWidget) => OverlayWidget) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  duplicateWidget: (id: string) => void;
  removeWidget: (id: string) => void;
}) {
  const w = selectedWidget;
  const kindDef = getWidgetDefinition(w.kind);
  const assetOptions = kindDef.assetFilter
    ? visualAssets.filter((a) => a.kind === kindDef.assetFilter)
    : visualAssets;
  const [assetPicker, setAssetPicker] = useState<null | "primary" | "secondary" | "sound">(null);
  const primaryAsset = getAssetById(scene, w.assets.primaryAssetId);
  const secondaryAsset = getAssetById(scene, w.assets.secondaryAssetId);
  const genericSoundAsset = getAssetById(scene, w.sound.assetId);

  return (
    <div className="space-y-3 pb-2">
      {/* Identity chip */}
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-[5px] border border-[var(--accent-border)] bg-[var(--accent-muted)]">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold truncate">{w.name}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{kindDef.label}</div>
        </div>
      </div>

      <PropSection title="Transform">
        <Field label="Nombre">
          <input className="amoled-input !py-1 text-xs" value={w.name}
            onChange={(e) => upW((v) => ({ ...v, name: e.target.value }))} />
        </Field>
        <Row>
          <Field label="X"><NumberField value={w.x}
            onChange={(v) => upW((p) => ({ ...p, x: v }))} /></Field>
          <Field label="Y"><NumberField value={w.y}
            onChange={(v) => upW((p) => ({ ...p, y: v }))} /></Field>
          <Field label="W"><NumberField min={20} value={w.width}
            onChange={(v) => upW((p) => ({ ...p, width: v }))} /></Field>
          <Field label="H"><NumberField min={20} value={w.height}
            onChange={(v) => upW((p) => ({ ...p, height: v }))} /></Field>
        </Row>
        <Row>
          <Btn onClick={() => upW((v) => ({ ...v, visible: !v.visible }))}>{w.visible ? "Ocultar" : "Mostrar"}</Btn>
          <Btn onClick={() => upW((v) => ({ ...v, locked: !v.locked }))}>{w.locked ? "Desbloquear" : "Bloquear"}</Btn>
          <Btn onClick={() => bringForward(w.id)}>▲ Capa</Btn>
          <Btn onClick={() => sendBackward(w.id)}>▼ Capa</Btn>
          <Btn onClick={() => duplicateWidget(w.id)}>Duplicar</Btn>
          <Btn onClick={() => removeWidget(w.id)} danger>Eliminar</Btn>
        </Row>
      </PropSection>

      <PanelDivider />

      <PropSection title="Estilo">
        <Field label={`Opacidad ${w.style.opacity}%`}>
          <input type="range" min={0} max={100} className="w-full accent-[var(--accent)]" value={w.style.opacity}
            onChange={(e) => upW((v) => ({ ...v, style: { ...v.style, opacity: Number(e.target.value) } }))} />
        </Field>
        <Row>
          <Field label="Radius">
            <NumberField min={0} value={w.style.borderRadius}
              onChange={(v) => upW((p) => ({ ...p, style: { ...p.style, borderRadius: v } }))} />
          </Field>
          <Field label="Font px">
            <NumberField min={6} value={w.style.fontSize}
              onChange={(v) => upW((p) => ({ ...p, style: { ...p.style, fontSize: v } }))} />
          </Field>
        </Row>
        <Row>
          <Field label="Fuente">
            <Dropdown compact
              options={OVERLAY_FONT_OPTIONS.map((f) => ({ value: f, label: f }))}
              value={w.style.fontFamily}
              onChange={(value) => upW((v) => ({ ...v, style: { ...v.style, fontFamily: value } }))} />
          </Field>
          <Field label="Animación">
            <Dropdown compact
              options={[
                { value: "none", label: "None" },
                { value: "fade", label: "Fade" },
                { value: "slide-up", label: "Slide Up" },
                { value: "pulse", label: "Pulse" },
              ]}
              value={w.style.animation}
              onChange={(value) => upW((v) => ({ ...v, style: { ...v.style, animation: value as OverlayWidget["style"]["animation"] } }))} />
          </Field>
        </Row>
        <Field label="Color texto">
          <ColorSwatch value={w.style.textColor} onChange={(v) => upW((c) => ({ ...c, style: { ...c.style, textColor: v } }))} />
        </Field>
        <Field label="Fondo">
          <ColorSwatch value={w.style.backgroundColor} onChange={(v) => upW((c) => ({ ...c, style: { ...c.style, backgroundColor: v } }))} />
        </Field>
        <Field label="Borde">
          <ColorSwatch value={w.style.borderColor} onChange={(v) => upW((c) => ({ ...c, style: { ...c.style, borderColor: v } }))} />
        </Field>
      </PropSection>

      <PanelDivider />

      {/* El widget Alert gestiona su propia media/sonido en su panel */}
      {widgetNeedsAssets(w) && w.kind !== "alert" && (
        <>
          <PropSection title="Assets">
            <Field label="Primario">
              <AssetPickerButton asset={primaryAsset} placeholder="Ninguno — elegir…" onClick={() => setAssetPicker("primary")} />
            </Field>
            <Field label="Secundario">
              <AssetPickerButton asset={secondaryAsset} placeholder="Ninguno — elegir…" onClick={() => setAssetPicker("secondary")} />
            </Field>
          </PropSection>
          <PanelDivider />
          {(assetPicker === "primary" || assetPicker === "secondary") && (
            <AssetPickerPopup
              title={assetPicker === "primary" ? "Asset primario" : "Asset secundario"}
              accept={kindDef.assetFilter === "video" ? "video/*" : "image/*"}
              assets={assetOptions}
              value={assetPicker === "primary" ? w.assets.primaryAssetId : w.assets.secondaryAssetId}
              onPick={(id) => upW((v) => ({ ...v, assets: { ...v.assets, [assetPicker === "primary" ? "primaryAssetId" : "secondaryAssetId"]: id } }))}
              onClose={() => setAssetPicker(null)} />
          )}
        </>
      )}

      {(["timer", "followerGoal"] as const).includes(w.kind as "timer" | "followerGoal") && (
        <>
          <PropSection title="Sonido">
            <Field label="Audio">
              <AssetPickerButton asset={genericSoundAsset} placeholder="Ninguno — elegir…" onClick={() => setAssetPicker("sound")} />
            </Field>
            <Field label={`Vol ${w.sound.volume}%`}>
              <input type="range" min={0} max={100} className="w-full accent-[var(--accent)]" value={w.sound.volume}
                onChange={(e) => upW((v) => ({ ...v, sound: { ...v.sound, volume: Number(e.target.value) } }))} />
            </Field>
          </PropSection>
          <PanelDivider />
          {assetPicker === "sound" && (
            <AssetPickerPopup
              title="Elegir sonido"
              accept="audio/*"
              assets={audioAssets}
              value={w.sound.assetId}
              onPick={(id) => upW((v) => ({ ...v, sound: { ...v.sound, assetId: id } }))}
              onClose={() => setAssetPicker(null)} />
          )}
        </>
      )}
      <WidgetDataProps w={w} upW={upW} visualAssets={visualAssets} audioAssets={audioAssets} />
    </div>
  );
}

function CustomWidgetEditorModal({
  widget,
  onSave,
  onClose,
  starterCode,
}: {
  widget: Extract<OverlayWidget, { kind: "custom" }>;
  onSave: (code: string, propsJson: string) => void;
  onClose: () => void;
  starterCode?: string;
}) {
  const [code, setCode] = useState(widget.data.componentCode);
  const [propsJson, setPropsJson] = useState(widget.data.propsJson);
  const [propsError, setPropsError] = useState(false);

  // Live-compiled preview — updates on every code / props change
  const CustomComponent = useCustomRenderableComponent(
    code.trim() ? code : null,
    DEFAULT_CUSTOM_WIDGET_CODE,
  );
  const parsedProps = useMemo(() => {
    try { const p = JSON.parse(propsJson); setPropsError(false); return p as Record<string, unknown>; }
    catch { setPropsError(true); return {}; }
  }, [propsJson]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const STARTER = starterCode ?? `({ title = "Mi Widget", accent = "#ff9a5c" }) => (
  <div
    className="h-full w-full flex items-center justify-center rounded-[16px]"
    style={{ background: "rgba(10,10,10,0.85)", border: \`1px solid \${accent}\`, color: "#fff" }}
  >
    <span style={{ fontSize: 28, fontWeight: 600 }}>{title}</span>
  </div>
)`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-stretch bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative m-auto flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-[10px] shadow-2xl overflow-hidden"
        style={{ width: "min(1100px, 96vw)", height: "min(720px, 92vh)" }}>

        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 rounded-full bg-[var(--accent)]" />
            <span className="text-[13px] font-semibold text-white">
              Custom TSX Widget
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">— {widget.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {!code.trim() && (
              <button
                type="button"
                onClick={() => setCode(STARTER)}
                className="amoled-button-ghost !px-3 !py-1 text-xs"
              >
                Insertar ejemplo
              </button>
            )}
            <button
              type="button"
              onClick={() => { onSave(code, propsJson); onClose(); }}
              className="amoled-button !px-4 !py-1 text-xs"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">

          {/* Editor column */}
          <div className="flex flex-col" style={{ width: "55%" }}>
            {/* Code editor */}
            <div className="flex-1 min-h-0 border-r border-[var(--border)]">
              <MonacoEditor
                height="100%"
                defaultLanguage="javascript"
                language="javascript"
                value={code}
                onChange={(val) => setCode(val ?? "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  tabSize: 2,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontLigatures: true,
                }}
              />
            </div>
            {/* Props JSON editor */}
            <div className="shrink-0 border-t border-r border-[var(--border)]" style={{ height: 130 }}>
              <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Props JSON
                </span>
                {propsError && (
                  <span className="text-[10px] text-red-400">— JSON inválido</span>
                )}
              </div>
              <MonacoEditor
                height={94}
                defaultLanguage="json"
                language="json"
                value={propsJson}
                onChange={(val) => setPropsJson(val ?? "{}")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: "off",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 4 },
                  tabSize: 2,
                }}
              />
            </div>
          </div>

          {/* Preview column */}
          <div className="flex flex-col flex-1 min-w-0 bg-[var(--background)]">
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-b border-[var(--border)]">
              <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                Preview en vivo
              </span>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top,rgba(255,154,92,0.06),transparent_60%),var(--background)]">
              {code.trim() ? (
                <div
                  className="w-full rounded-[8px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
                  style={{ aspectRatio: `${widget.width}/${widget.height}`, maxHeight: "100%" }}
                >
                  <CustomComponent {...parsedProps} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,154,92,0.3)" strokeWidth="1.5">
                    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                  </svg>
                  <span className="text-xs text-[var(--text-muted)]">
                    Escribe código TSX para ver el preview
                  </span>
                  <button
                    type="button"
                    onClick={() => setCode(STARTER)}
                    className="amoled-button !px-4 !py-1.5 text-xs mt-1"
                  >
                    Insertar ejemplo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NowPlayingPropsPanel({
  w,
  upW,
}: {
  w: Extract<OverlayWidget, { kind: "nowPlaying" }>;
  upW: (fn: (widget: OverlayWidget) => OverlayWidget) => void;
}) {
  const { layout, showAlbumArt } = w.data;
  const globalConn = useMemo(() => readLastFmConnection(), []);

  return (
    <>
      <PanelDivider />
      <PropSection title="Now Playing · Last.fm">
        {globalConn?.apiKey ? (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-[6px] bg-emerald-400/10 border border-emerald-400/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[10px] text-emerald-300">
              Conectado como <strong>{globalConn.username}</strong>
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-[var(--text-muted)] px-1">
            Conecta Last.fm en Ajustes → Conexiones para activar el widget.
          </div>
        )}

        <PanelDivider />

        <Field label="Layout">
          <Dropdown compact
            options={[
              { value: "compact", label: "Compact" },
              { value: "full", label: "Full" },
            ]}
            value={layout}
            onChange={(value) =>
              upW((v) =>
                v.kind === "nowPlaying"
                  ? { ...v, data: { ...v.data, layout: value as "compact" | "full" } }
                  : v,
              )
            }
          />
        </Field>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            className="rawen-checkbox"
            checked={showAlbumArt}
            onChange={(e) =>
              upW((v) =>
                v.kind === "nowPlaying"
                  ? { ...v, data: { ...v.data, showAlbumArt: e.target.checked } }
                  : v,
              )
            }
          />
          Mostrar portada
        </label>
      </PropSection>
    </>
  );
}

/**
 * Campo de propiedades genérico: renderiza cualquier campo declarativo del
 * registro (widgetRegistry.ts) y escribe sobre `widget.data[key]`.
 */
function SchemaFieldInput({ w, upW, field }: {
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
          <input className={`amoled-input !py-1 text-xs ${field.mono ? "font-mono" : ""}`}
            value={value} placeholder={field.placeholder}
            onChange={(e) => set(field.nullable ? (e.target.value || null) : e.target.value)} />
        </Field>
      );
    }
    case "number":
      return (
        <Field label={field.label}>
          <NumberField value={Number(data[field.key] ?? 0)}
            onChange={(v) => set(v)} />
        </Field>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
          <input type="checkbox" className="rawen-checkbox" checked={Boolean(data[field.key])}
            onChange={(e) => set(e.target.checked)} />
          {field.label}
        </label>
      );
    case "select":
      return (
        <Field label={field.label}>
          <Dropdown compact options={field.options}
            value={String(data[field.key] ?? field.options[0]?.value ?? "")}
            onChange={(value) => set(value)} />
        </Field>
      );
    case "list": {
      const items = Array.isArray(data[field.key]) ? (data[field.key] as string[]) : [];
      return (
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">{field.label}</span>
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <input className="amoled-input !py-1 text-xs flex-1" value={item}
                placeholder={`${field.itemPlaceholder ?? "Item"} ${i + 1}`}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  set(next);
                }} />
              <button type="button" onClick={() => set(items.filter((_, j) => j !== i))}
                className="shrink-0 text-[var(--text-muted)] hover:text-red-300 transition-colors text-[11px] px-1">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => set([...items, ""])}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-[5px] border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-border)] transition-colors text-[10px]">
            <span className="text-[var(--accent)]">+</span> Añadir
          </button>
        </div>
      );
    }
  }
}

/** Panel de propiedades generado a partir de la definición del registro. */
function SchemaPanel({ w, upW }: {
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

function AlertPropsPanel({ w, upW, visualAssets, audioAssets }: {
  w: Extract<OverlayWidget, { kind: "alert" }>;
  upW: (fn: (w: OverlayWidget) => OverlayWidget) => void;
  visualAssets: OverlayAsset[];
  audioAssets: OverlayAsset[];
}) {
  const sessionPlatform = useSessionPlatform();
  // Sanitizado: widgets viejos no traen events/templates y tronaría el panel
  const data = sanitizeAlertData(w.data);
  const { scene } = useOverlayEditorStore();
  const [picker, setPicker] = useState<null | "media" | "sound">(null);
  const mediaAsset = data.mediaAssetId ? getAssetById(scene, data.mediaAssetId) : undefined;
  const soundAsset = data.soundAssetId ? getAssetById(scene, data.soundAssetId) : undefined;
  const upData = (patch: Partial<typeof data>) =>
    upW((v) => (v.kind === "alert" ? { ...v, data: { ...v.data, ...patch } } : v));
  const kinds = Object.keys(ALERT_EVENT_LABELS) as AlertEventKind[];
  const mediaOptions = visualAssets.filter((a) =>
    data.mediaKind === "video" ? a.kind === "video" : a.kind === "image" || a.kind === "gif");

  return (
    <>
      <PanelDivider />
      <PropSection title="Eventos">
        {sessionPlatform === "kick" && (
          <div className="text-[10px] leading-relaxed text-amber-300/90 bg-amber-400/10 border border-amber-400/20 rounded-md px-2.5 py-2">
            Kick no tiene API pública de eventos: las alertas solo funcionan con Twitch.
          </div>
        )}
        <div className="text-[10px] leading-relaxed text-[var(--text-muted)] px-1">
          Conecta tu canal en Configuración → Conexiones. Los eventos llegan en tiempo real vía EventSub.
        </div>
        <div className="space-y-1.5">
          {kinds.map((kind) => (
            <div key={kind} className="flex items-center gap-2">
              <label className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
                <input type="checkbox" className="rawen-checkbox" checked={data.events[kind] ?? true}
                  onChange={(e) => upData({ events: { ...data.events, [kind]: e.target.checked } })} />
                {ALERT_EVENT_LABELS[kind]}
              </label>
              <Btn onClick={() => void sendTestAlert(kind)}>Probar</Btn>
            </div>
          ))}
        </div>
      </PropSection>

      <PanelDivider />
      <PropSection title="Mensaje">
        {kinds.map((kind) => (
          <Field key={kind} label={ALERT_EVENT_LABELS[kind]}>
            <input className="amoled-input !py-1 text-xs" value={data.templates[kind] ?? DEFAULT_ALERT_TEMPLATES[kind]}
              onChange={(e) => upData({ templates: { ...data.templates, [kind]: e.target.value } })} />
          </Field>
        ))}
        <div className="text-[10px] text-[var(--text-muted)] px-1">Marcadores: {"{user}"} y {"{count}"}</div>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
          <input type="checkbox" className="rawen-checkbox" checked={data.ttsEnabled}
            onChange={(e) => upData({ ttsEnabled: e.target.checked })} />
          Leer en voz alta (TTS)
        </label>
        {data.ttsEnabled && (
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)] pl-5">
            <input type="checkbox" className="rawen-checkbox" checked={data.ttsAfterSound}
              onChange={(e) => upData({ ttsAfterSound: e.target.checked })} />
            Leer después del sonido
          </label>
        )}
      </PropSection>

      <PanelDivider />
      <PropSection title="Media y sonido">
        <Field label="Tipo de media">
          <Dropdown compact
            options={[{ value: "none", label: "Ninguna" }, { value: "image", label: "Imagen / GIF" }, { value: "video", label: "Video" }]}
            value={data.mediaKind}
            onChange={(value) => upData({ mediaKind: value as "none" | "image" | "video", mediaAssetId: null })} />
        </Field>
        {data.mediaKind !== "none" && (
          <Field label="Asset">
            <AssetPickerButton asset={mediaAsset} placeholder="Ninguno — elegir…" onClick={() => setPicker("media")} />
          </Field>
        )}
        <Field label="Sonido">
          <AssetPickerButton asset={soundAsset} placeholder="Ninguno — elegir…" onClick={() => setPicker("sound")} />
        </Field>
        <Field label={`Volumen ${data.soundVolume}%`}>
          <input type="range" min={0} max={100} className="w-full accent-[var(--accent)]" value={data.soundVolume}
            onChange={(e) => upData({ soundVolume: Number(e.target.value) })} />
        </Field>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
          <input type="checkbox" className="rawen-checkbox" checked={data.soundInEditor}
            onChange={(e) => upData({ soundInEditor: e.target.checked })} />
          Sonar también en el editor (OBS siempre suena)
        </label>
      </PropSection>

      <PanelDivider />
      <PropSection title="Aparición">
        <Row>
          <Field label="Texto">
            <Dropdown compact
              options={[{ value: "bottom", label: "Abajo" }, { value: "top", label: "Arriba" }, { value: "center", label: "Centrado" }]}
              value={data.textPosition}
              onChange={(value) => upData({ textPosition: value as "bottom" | "top" | "center" })} />
          </Field>
          <Field label="Duración s">
            <NumberField min={2} value={data.duration} onChange={(v) => upData({ duration: v })} />
          </Field>
        </Row>
      </PropSection>

      {picker === "media" && (
        <AssetPickerPopup
          title={data.mediaKind === "video" ? "Elegir video" : "Elegir imagen"}
          accept={data.mediaKind === "video" ? "video/*" : "image/*"}
          assets={mediaOptions}
          value={data.mediaAssetId}
          onPick={(id) => upData({ mediaAssetId: id })}
          onClose={() => setPicker(null)} />
      )}
      {picker === "sound" && (
        <AssetPickerPopup
          title="Elegir sonido"
          accept="audio/*"
          assets={audioAssets}
          value={data.soundAssetId}
          onPick={(id) => upData({ soundAssetId: id })}
          onClose={() => setPicker(null)} />
      )}
    </>
  );
}

function WidgetDataProps({ w, upW, visualAssets, audioAssets }: {
  w: OverlayWidget;
  upW: (fn: (w: OverlayWidget) => OverlayWidget) => void;
  visualAssets: OverlayAsset[];
  audioAssets: OverlayAsset[];
}) {
  const [customEditorOpen, setCustomEditorOpen] = useState<string | null>(null);
  const sessionPlatform = useSessionPlatform();

  if (w.kind === "alert") {
    return <AlertPropsPanel w={w} upW={upW} visualAssets={visualAssets} audioAssets={audioAssets} />;
  }

  if (w.kind === "chatBox") {
    // Canal y plataforma ya no se configuran por widget: vienen de la sesión actual
    const platform    = sessionPlatform;
    const showFrame   = w.data.showFrame   ?? true;
    const frameTitle  = w.data.frameTitle  ?? "Chat";
    const chatPadding = w.data.chatPadding ?? 0;
    const headerCode  = w.data.headerCode  ?? "";
    const messageCode = w.data.messageCode ?? "";

    // When the header editor opens with no custom code, load the real default header
    const headerEditorCode = headerCode.trim() || DEFAULT_HEADER_CODE;

    // When the message editor opens with no custom code, load the stored global OBS style
    // (what the user already set up for their /obs page), falling back to DEFAULT_COMPONENT_CODE
    const storedObsCode = getFromStorage<string>(STORAGE_KEYS.OBS_CSS) ?? "";
    const messageEditorCode = messageCode.trim() || storedObsCode.trim() || DEFAULT_COMPONENT_CODE;

    return (
      <>
        <PanelDivider />
        <PropSection title="Chat Box">
          <div className="text-[10px] leading-relaxed text-[var(--text-muted)] px-1">
            El canal y la plataforma se toman de la sesión actual.
          </div>
          <Field label={`Padding ${chatPadding}px`}>
            <input type="range" min={0} max={40} className="w-full accent-[var(--accent)]" value={chatPadding}
              onChange={(e) => upW((v) => v.kind === "chatBox" ? { ...v, data: { ...v.data, chatPadding: Number(e.target.value) } } : v)} />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
            <input type="checkbox" className="rawen-checkbox" checked={showFrame}
              onChange={(e) => upW((v) => v.kind === "chatBox" ? { ...v, data: { ...v.data, showFrame: e.target.checked } } : v)} />
            Mostrar frame
          </label>
          {showFrame && (
            <>
              <Field label="Título">
                <input className="amoled-input !py-1 text-xs" value={frameTitle}
                  onChange={(e) => upW((v) => v.kind === "chatBox" ? { ...v, data: { ...v.data, frameTitle: e.target.value } } : v)} />
              </Field>
              <Btn full accent onClick={() => setCustomEditorOpen("header")}>
                Editar header{headerCode.trim() ? ` · ${headerCode.trim().split("\n").length}L` : ""}
              </Btn>
            </>
          )}
          <Btn full accent onClick={() => setCustomEditorOpen("message")}>
            Editar mensajes{messageCode.trim() ? ` · ${messageCode.trim().split("\n").length}L` : ""}
          </Btn>
        </PropSection>

        {/* Header editor modal */}
        {customEditorOpen === "header" && (
          <CustomWidgetEditorModal
            widget={{ ...w, data: { ...w.data,
              componentCode: headerEditorCode,
              propsJson: JSON.stringify({ title: frameTitle, platform, borderColor: w.style.borderColor, backgroundColor: w.style.backgroundColor, textColor: w.style.textColor, fontFamily: w.style.fontFamily, fontSize: w.style.fontSize }, null, 2),
            } } as unknown as Extract<OverlayWidget, { kind: "custom" }>}
            starterCode={DEFAULT_HEADER_CODE}
            onSave={(code) => upW((v) => v.kind === "chatBox" ? { ...v, data: { ...v.data, headerCode: code } } : v)}
            onClose={() => setCustomEditorOpen(null)}
          />
        )}

        {/* Message editor modal */}
        {customEditorOpen === "message" && (
          <CustomWidgetEditorModal
            widget={{ ...w, data: { ...w.data,
              componentCode: messageEditorCode,
              propsJson: JSON.stringify({ msg: { username: "ChatUser", message: "Hola mundo! 🎉", color: "#ff9a5c", timestamp: new Date().toISOString() } }, null, 2),
            } } as unknown as Extract<OverlayWidget, { kind: "custom" }>}
            starterCode={DEFAULT_COMPONENT_CODE}
            onSave={(code) => {
              // Save to OBS_CSS — same store that /obs and ChatPanel read from
              saveToStorage(STORAGE_KEYS.OBS_CSS, code);
              if (typeof window !== "undefined" && window.electron) {
                void window.electron.saveObsComponent(code);
              }
              // Also keep it on the widget so the preview is consistent
              upW((v) => v.kind === "chatBox" ? { ...v, data: { ...v.data, messageCode: code } } : v);
            }}
            onClose={() => setCustomEditorOpen(null)}
          />
        )}
      </>
    );
  }

  if (w.kind === "obsChat") {
    const [obsChatEditorOpen, setObsChatEditorOpen] = useState(false);
    const storedObsCode = getFromStorage<string>(STORAGE_KEYS.OBS_CSS) ?? "";
    const obsMessageEditorCode = storedObsCode.trim() || DEFAULT_COMPONENT_CODE;

    return (
      <>
        <PanelDivider />
        <PropSection title="OBS Chat">
          <div className="text-[10px] leading-relaxed text-[var(--text-muted)] px-1">
            El canal y la plataforma se toman de la sesión actual.
          </div>
          <Btn full accent onClick={() => setObsChatEditorOpen(true)}>
            Editar mensajes{storedObsCode.trim() ? ` · ${storedObsCode.trim().split("\n").length}L` : ""}
          </Btn>
        </PropSection>

        {obsChatEditorOpen && (
          <CustomWidgetEditorModal
            widget={{
              ...w,
              data: {
                componentCode: obsMessageEditorCode,
                propsJson: JSON.stringify({
                  msg: {
                    username: "ChatUser",
                    message: "Hola mundo! 🎉",
                    color: "#ff9a5c",
                    timestamp: new Date().toISOString(),
                    parts: [
                      { type: "text", text: "Hola mundo! " },
                      { type: "emote", code: "EmoteTest", url: "https://static-cdn.jtvnw.net/emoticons/v2/30259/default/dark/2.0" },
                    ],
                  },
                }, null, 2),
              },
            } as unknown as Extract<OverlayWidget, { kind: "custom" }>}
            starterCode={DEFAULT_COMPONENT_CODE}
            onSave={(code) => {
              saveToStorage(STORAGE_KEYS.OBS_CSS, code);
              if (typeof window !== "undefined" && window.electron) {
                void window.electron.saveObsComponent(code);
              }
              window.dispatchEvent(new StorageEvent("storage", {
                key: STORAGE_KEYS.OBS_CSS,
                newValue: code,
              }));
            }}
            onClose={() => setObsChatEditorOpen(false)}
          />
        )}
      </>
    );
  }

  if (w.kind === "nowPlaying") {
    return <NowPlayingPropsPanel w={w} upW={upW} />;
  }

  if (w.kind === "custom") return (
    <>
      <PanelDivider />
      <PropSection title="Custom Widget">
        <Btn full accent onClick={() => setCustomEditorOpen("custom")}>
          Editar código
        </Btn>
        {w.data.componentCode.trim() && (
          <div className="text-[10px] text-[var(--text-muted)] px-1">
            {w.data.componentCode.trim().split("\n").length} líneas
          </div>
        )}
      </PropSection>
      {customEditorOpen === "custom" && (
        <CustomWidgetEditorModal
          widget={w}
          onSave={(code, propsJson) =>
            upW((v) => v.kind === "custom" ? { ...v, data: { componentCode: code, propsJson } } : v)
          }
          onClose={() => setCustomEditorOpen(null)}
        />
      )}
    </>
  );

  // El resto de widgets genera su panel automáticamente desde el registro
  // (widgetRegistry.ts) — añadir un widget nuevo no requiere tocar este archivo.
  const def = getWidgetDefinition(w.kind);
  if ((def.fields && def.fields.length > 0) || def.hint) {
    return <SchemaPanel w={w} upW={upW} />;
  }

  return null;
}

function ScenePanel({ scenes, activeSceneId, onSwitch, onCreate, onRename, onDuplicate, onDelete }: {
  scenes: import("@/types/overlay").OverlaySceneConfig[];
  activeSceneId: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => string | null;
  onRename: (id: string, name: string) => string | null;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");
  const [newName, setNewName] = useState("");
  const [newNameError, setNewNameError] = useState("");
  const [creating, setCreating] = useState(false);

  function commitRename(id: string) {
    if (!draft.trim()) { setDraftError("El nombre no puede estar vacío."); return; }
    const err = onRename(id, draft.trim());
    if (err) { setDraftError(err); return; }
    setEditingId(null);
    setDraftError("");
  }

  function commitCreate() {
    const name = newName.trim() || "New Scene";
    const err = onCreate(name);
    if (err) { setNewNameError(err); return; }
    setCreating(false);
    setNewName("");
    setNewNameError("");
  }

  return (
    <div className="space-y-1">
      {scenes.map((s) => (
        <div key={s.id}
          className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer border transition-colors ${
            s.id === activeSceneId
              ? "border-[var(--accent-border)] bg-[var(--accent-muted)]"
              : "border-transparent hover:border-[var(--border)] hover:bg-[var(--elevated)]"
          }`}
          onClick={() => {
            if (editingId !== s.id) onSwitch(s.id);
          }}
        >
          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.id === activeSceneId ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />
          {editingId === s.id ? (
            <div className="flex-1 min-w-0 space-y-0.5" onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                className={`amoled-input !py-0.5 !px-1.5 text-xs w-full ${draftError ? "border-red-500/50" : ""}`}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setDraftError(""); }}
                onBlur={() => commitRename(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(s.id);
                  if (e.key === "Escape") { setEditingId(null); setDraftError(""); }
                }}
              />
              {draftError && (
                <div className="text-[10px] text-red-400 leading-tight px-0.5">{draftError}</div>
              )}
            </div>
          ) : (
            <span className="flex-1 min-w-0 truncate text-xs"
              onDoubleClick={(e) => { e.stopPropagation(); setEditingId(s.id); setDraft(s.name); setDraftError(""); }}>
              {s.name}
            </span>
          )}
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--elevated)] transition-colors" title="Renombrar"
              onClick={() => { setEditingId(s.id); setDraft(s.name); setDraftError(""); }}>
              <IconPencil className="h-3 w-3" />
            </button>
            <button className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--elevated)] transition-colors" title="Duplicar"
              onClick={() => onDuplicate(s.id)}>
              <IconCopy className="h-3 w-3" />
            </button>
            {scenes.length > 1 && (
              <button className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-300 hover:bg-[var(--elevated)] transition-colors" title="Eliminar"
                onClick={() => onDelete(s.id)}>
                <IconX className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Inline create row */}
      {creating ? (
        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            className={`amoled-input !py-1 text-xs w-full ${newNameError ? "border-red-500/50" : ""}`}
            placeholder="Nombre de escena"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setNewNameError(""); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); setNewNameError(""); }
            }}
          />
          {newNameError && (
            <div className="text-[10px] text-red-400 leading-tight px-0.5">{newNameError}</div>
          )}
          <div className="flex gap-1.5">
            <Btn full accent onClick={commitCreate}>Crear</Btn>
            <Btn full onClick={() => { setCreating(false); setNewName(""); setNewNameError(""); }}>Cancelar</Btn>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setCreating(true)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-border)] transition-colors text-xs">
          <IconPlus className="h-3 w-3 text-[var(--accent)]" />
          <span>Nueva escena</span>
        </button>
      )}
    </div>
  );
}

// La lista y el orden de widgets disponibles viene del registro (widgetRegistry.ts)
const WIDGET_KINDS = WIDGET_KIND_ORDER;

// Widgets de la escena que requieren una conexión que no está establecida.
// Los requisitos viven en el registry de cada widget (requires/requiresSatisfied).
type MissingConnection = { widgetName: string; needs: ConnectionNeed[] };
const CONNECTION_NEED_LABEL: Record<ConnectionNeed, string> = {
  twitch: "Twitch",
  lastfm: "Last.fm",
  session: "sesión de chat",
};
function getMissingConnections(scene: OverlaySceneConfig): MissingConnection[] {
  const state: Record<ConnectionNeed, boolean> = {
    twitch: Boolean(readTwitchAuth()?.accessToken),
    lastfm: Boolean(readLastFmConnection()?.apiKey),
    session: Boolean((getFromStorage<string>(STORAGE_KEYS.LAST_CHANNEL) ?? "").trim()),
  };
  const out: MissingConnection[] = [];
  for (const w of scene.widgets) {
    const def = getWidgetDefinition(w.kind);
    const needs = (def.requires ?? []).filter((need) => !state[need]);
    if (needs.length && !def.requiresSatisfied?.(w)) {
      out.push({ widgetName: w.name, needs });
    }
  }
  return out;
}

/** Popup con los pasos para montar el overlay en OBS */
function HowToObsModal({ scene, onClose }: { scene: OverlaySceneConfig; onClose: () => void }) {
  const url = getOverlayLiveUrl(scene);
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-[440px] max-w-[92vw] rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="text-sm font-semibold text-white">Cómo usarlo en OBS</div>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-4 py-3 space-y-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
          <ol className="space-y-2 list-decimal list-inside">
            <li>En OBS ve a <strong className="text-white">Fuentes → + → Navegador</strong> (Browser Source).</li>
            <li>Pega la URL de esta escena:
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex-1 min-w-0 truncate font-mono text-[10px] px-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--text-muted)]">{url}</div>
                <Btn accent onClick={() => { void navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? "¡Copiada!" : "Copiar"}
                </Btn>
              </div>
            </li>
            <li>Pon la resolución igual a la del lienzo: <strong className="text-white">{scene.width} × {scene.height}</strong> (ancho y alto del Browser Source, idealmente la misma que tu lienzo de OBS).</li>
            <li>Si usas alertas con sonido, marca <strong className="text-white">“Controlar audio vía OBS”</strong> en la fuente.</li>
            <li>El fondo es transparente: el overlay se integra directo sobre tu stream.</li>
          </ol>
          <p className="text-[10px] text-[var(--text-muted)]">
            La URL es por escena: si cambias de escena en el editor, actualiza la URL de la fuente (o crea una fuente por escena).
          </p>
        </div>
        <div className="px-4 py-3 border-t border-[var(--border)] flex justify-end">
          <Btn onClick={onClose}>Cerrar</Btn>
        </div>
      </div>
    </div>
  );
}

export default function OverlayEditorClient({ embedded = false }: OverlayEditorClientProps) {
  const {
    scene, scenes, activeSceneId, selectedWidgetId, selectedAssetId,
    initialize, selectWidget, selectAsset, addWidget,
    updateWidget, removeWidget, duplicateWidget, bringForward, sendBackward,
    addAsset, removeAsset, setScene, createScene, switchScene,
    renameScene, duplicateScene, deleteScene, resetScene, saveSettings,
  } = useOverlayEditorStore();

  // El preview recibe alertas reales y de prueba vía bridge
  useOverlayAlerts();

  const selectedWidget = useMemo(() => getSelectedWidget(scene, selectedWidgetId), [scene, selectedWidgetId]);

  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stageScale, setStageScale] = useState(1);
  const [assetUrl, setAssetUrl] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetsPanelOpen, setAssetsPanelOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState("");
  const [bgAssetPicker, setBgAssetPicker] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [connTick, setConnTick] = useState(0);
  const [bridgeOnline, setBridgeOnline] = useState(false);

  // Refresca los avisos de conexión al conectar/desconectar cualquier cosa
  useEffect(() => {
    const bump = () => setConnTick((t) => t + 1);
    const events = [
      "storage",
      "rawenchat-connections-changed",
      TWITCH_AUTH_CHANGED_EVENT,
      LASTFM_CONNECTION_CHANGED_EVENT,
      OVERLAY_SESSION_CHANGED_EVENT,
    ];
    events.forEach((e) => window.addEventListener(e, bump));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
  }, []);

  // Al conectar/desconectar Last.fm re-sincroniza la escena al servidor:
  // las credenciales viajan inyectadas en el widget para el contexto de OBS
  useEffect(() => {
    const sync = () => useOverlayEditorStore.getState().saveSettings();
    window.addEventListener(LASTFM_CONNECTION_CHANGED_EVENT, sync);
    return () => window.removeEventListener(LASTFM_CONNECTION_CHANGED_EVENT, sync);
  }, []);
  const missingConnections = useMemo(() => getMissingConnections(scene), [scene, connTick]);
  // Un banner por cada conexión faltante, listando los widgets que la ocupan
  const missingBanners = useMemo(() => {
    const byNeed = new Map<ConnectionNeed, string[]>();
    for (const m of missingConnections) {
      for (const n of m.needs) byNeed.set(n, [...(byNeed.get(n) ?? []), m.widgetName]);
    }
    return [...byNeed.entries()];
  }, [missingConnections]);

  // Left sidebar active tab
  const [leftTab, setLeftTab] = useState<"scenes" | "widgets">("widgets");

  useEffect(() => { initialize(); }, [initialize]);

  // Bridge ping
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const ok = await isOverlayBridgeAvailable();
      if (mounted) setBridgeOnline(ok);
    };
    void check();
    const t = setInterval(() => void check(), 5000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  // Auto-scale canvas to fit stage
  useEffect(() => {
    if (!stageRef.current) return;
    const obs = new ResizeObserver(() => {
      const el = stageRef.current;
      if (!el) return;
      const pad = 48;
      const sw = (el.clientWidth - pad) / scene.width;
      const sh = (el.clientHeight - pad) / scene.height;
      setStageScale(Math.min(1, sw, sh));
    });
    obs.observe(stageRef.current);
    return () => obs.disconnect();
  }, [scene.width, scene.height]);

  // Status auto-clear
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(""), 2000);
    return () => clearTimeout(t);
  }, [status]);

  // Copied auto-clear
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(""), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  // Delete selected widget with Supr/Delete key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      // Don't fire when typing inside an input, textarea or contenteditable
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
      if (!selectedWidgetId) return;
      removeWidget(selectedWidgetId);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedWidgetId, removeWidget]);

  const visualAssets = useMemo(() => scene.assets.filter((a) => a.kind !== "audio"), [scene.assets]);
  const audioAssets  = useMemo(() => scene.assets.filter((a) => a.kind === "audio"),  [scene.assets]);

  // Helpers
  function upW(fn: (w: OverlayWidget) => OverlayWidget) {
    if (!selectedWidgetId) return;
    updateWidget(selectedWidgetId, fn);
  }

  function usw<K extends keyof import("@/types/overlay").OverlaySceneConfig>(
    key: K, value: import("@/types/overlay").OverlaySceneConfig[K]
  ) { setScene((s) => ({ ...s, [key]: value })); }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const kind = inferAssetKind(file);
      const dataUrl = await fileToDataUrl(file);
      let finalSrc = dataUrl;
      try {
        const saved = await window.electron?.saveOverlayAsset(file.name, dataUrl);
        if (saved?.url) finalSrc = saved.url;
      } catch {}
      addAsset(createOverlayAsset({ name: file.name, kind, src: finalSrc, thumbnailSrc: finalSrc }));
    }
  }

  function addFromUrl() {
    if (!assetUrl.trim()) return;
    const kind = inferKindFromUrl(assetUrl);
    addAsset(createOverlayAsset({ name: assetName || assetUrl.split("/").pop() || "asset", kind, src: assetUrl, thumbnailSrc: assetUrl }));
    setAssetUrl(""); setAssetName("");
  }

  function handleWidgetChange(_id: string, widget: OverlayWidget) {
    updateWidget(widget.id, () => widget);
  }

  return (
    <main className={`${embedded ? "flex-1 min-h-0" : "h-screen"} bg-[var(--background)] text-white flex flex-col overflow-hidden`}>
      {/* Topbar — standalone window */}
      {!embedded && (
        <header className="h-11 shrink-0 flex items-center justify-between border-b border-[var(--border)] px-3 gap-2 bg-[var(--surface)]"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
          <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <span className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
              Overlay Editor
            </span>
            <div className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium ${
              bridgeOnline ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"
            }`}>
              <span className={`h-1 w-1 rounded-full ${bridgeOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              {bridgeOnline ? "Live" : "Local"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
            {copied || status || `${scene.width}×${scene.height} · ${Math.round(stageScale * 100)}%`}
          </div>
          <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <Btn accent onClick={() => { void navigator.clipboard.writeText(getOverlayLiveUrl(scene)); setCopied("¡Copiada!"); }}>URL OBS</Btn>
            <Btn onClick={() => setHowToOpen(true)}>Cómo usar</Btn>
            <Btn onClick={() => window.open(getOverlayLiveUrl(scene), "_blank", "noopener,noreferrer")}>Vista en vivo</Btn>
            <ControlBox />
          </div>
        </header>
      )}

      {/* URL strip — embedded mode only */}
      {embedded && (
        <div className="shrink-0 flex items-center gap-2.5 px-3 h-10 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium ${
            bridgeOnline ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"
          }`}>
            <span className={`h-1 w-1 rounded-full ${bridgeOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            {bridgeOnline ? "Live" : "Local"}
          </div>
          <div className="flex-1 min-w-0 text-[11px] text-[var(--text-muted)] truncate font-mono">
            {copied || getOverlayLiveUrl(scene)}
          </div>
          <Btn accent onClick={() => { void navigator.clipboard.writeText(getOverlayLiveUrl(scene)); setCopied("¡Copiada!"); }}>
            {copied ? "¡Copiada!" : "Copiar URL"}
          </Btn>
          <Btn onClick={() => setHowToOpen(true)}>Cómo usar</Btn>
          <Btn onClick={() => window.open(getOverlayLiveUrl(scene), "_blank", "noopener,noreferrer")}>
            Abrir
          </Btn>
        </div>
      )}

      {/* Aviso a la vista: un banner por cada conexión pendiente */}
      {missingBanners.map(([need, names]) => (
        <div key={need} className="shrink-0 flex items-center gap-2.5 px-3 py-2 border-b border-amber-400/20 bg-amber-400/10">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="flex-1 min-w-0 truncate text-[11px] text-amber-200/90">
            {names.join(", ")} {names.length > 1 ? "necesitan" : "necesita"} conexión a {CONNECTION_NEED_LABEL[need]}
          </div>
          <Btn accent onClick={() => window.dispatchEvent(new Event("rawenchat-open-settings"))}>Conectar</Btn>
        </div>
      ))}

      <div className="flex flex-1 min-h-0 overflow-hidden">

        <aside className="w-56 shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--surface)] overflow-hidden">

          {/* Tab bar */}
          <div className="p-2 shrink-0">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--elevated)] p-1">
              {(["scenes", "widgets"] as const).map((tab) => (
                <button key={tab} type="button"
                  onClick={() => setLeftTab(tab)}
                  className={`h-7 rounded-md text-[11px] font-medium transition-colors ${
                    leftTab === tab
                      ? "bg-[var(--card)] text-white border border-[var(--border)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-white border border-transparent"
                  }`}>
                  {tab === "scenes" ? "Escenas" : "Widgets"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto rawen-scrollbar px-2.5 py-1">

            {leftTab === "scenes" && (
              <ScenePanel
                scenes={scenes} activeSceneId={activeSceneId}
                onSwitch={switchScene} onCreate={createScene}
                onRename={renameScene} onDuplicate={duplicateScene} onDelete={deleteScene}
              />
            )}

            {leftTab === "widgets" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <PanelHeading title="En escena" count={scene.widgets.length} />
                  {scene.widgets.length === 0 && (
                    <div className="text-[11px] text-[var(--text-muted)] px-1 py-3 text-center">Sin widgets todavía</div>
                  )}
                  {[...scene.widgets].sort((a, b) => b.zIndex - a.zIndex).map((widget) => (
                    <div key={widget.id}
                      className={`group w-full flex items-center gap-2 px-2 py-2 rounded-lg border transition-colors ${
                        selectedWidgetId === widget.id
                          ? "border-[var(--accent-border)] bg-[var(--accent-muted)]"
                          : "border-transparent hover:border-[var(--border)] hover:bg-[var(--elevated)]"
                      }`}>
                      <button type="button" className="flex items-center gap-2 flex-1 min-w-0 text-left"
                        onClick={() => selectWidget(widget.id)}>
                        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${widget.visible ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />
                        <span className={`text-xs truncate flex-1 ${selectedWidgetId === widget.id ? "text-white" : "text-[var(--text-secondary)]"}`}>{widget.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">{getWidgetDefinition(widget.kind).label}</span>
                      </button>
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
                        className="shrink-0 text-[var(--text-muted)] hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100">
                        <IconX className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <PanelHeading title="Añadir widget" />
                  <div className="grid grid-cols-1 gap-0.5">
                    {WIDGET_KINDS.map((kind) => (
                      <button key={kind} type="button" onClick={() => addWidget(kind)}
                        className="flex items-center gap-2 px-2 py-2 rounded-lg border border-transparent hover:border-[var(--border)] hover:bg-[var(--elevated)] text-[var(--text-muted)] hover:text-white transition-colors text-xs text-left">
                        <IconPlus className="h-3 w-3 text-[var(--accent)]" />
                        {getWidgetDefinition(kind).label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Project assets strip */}
          <div className="shrink-0 border-t border-[var(--border)]">
            <button type="button" onClick={() => setAssetsPanelOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-[var(--text-muted)] hover:text-white transition-colors">
              <PanelHeading title="Assets" count={scene.assets.length} />
              <IconChevron open={assetsPanelOpen} className="h-3.5 w-3.5" />
            </button>
            {assetsPanelOpen && (
              <div className="px-2.5 pb-2.5 space-y-2.5 max-h-[240px] overflow-y-auto rawen-scrollbar">
                <div className="flex gap-1.5">
                  <Btn full onClick={() => fileInputRef.current?.click()}>Upload</Btn>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*" className="hidden"
                    onChange={(e) => void handleFiles(e.target.files)} />
                  <input className="amoled-input flex-1 !py-1 text-[11px]" placeholder="https://…" value={assetUrl}
                    onChange={(e) => setAssetUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addFromUrl(); }} />
                </div>
                {visualAssets.length > 0 && (
                  <div className="grid grid-cols-3 gap-1">
                    {visualAssets.map((a) => (
                      <AssetThumb key={a.id} asset={a} selected={selectedAssetId === a.id}
                        onSelect={() => selectAsset(a.id)} onRemove={() => removeAsset(a.id)} />
                    ))}
                  </div>
                )}
                {audioAssets.length > 0 && (
                  <div className="space-y-1">
                    {audioAssets.map((a) => (
                      <div key={a.id} onClick={() => selectAsset(a.id)}
                        className={`group flex items-center gap-2 rounded-lg border px-2 py-1.5 cursor-pointer text-[11px] transition ${
                          selectedAssetId === a.id ? "border-[var(--accent-border)] bg-[var(--accent-muted)] text-white" : "border-[var(--border)] text-[var(--text-muted)] hover:text-white"
                        }`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>
                        <span className="truncate flex-1">{a.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeAsset(a.id); }}
                          className="text-[var(--text-muted)] hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          <IconX className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {bgAssetPicker && (
          <AssetPickerPopup
            title="Fondo de escena"
            accept="image/*,video/*"
            assets={visualAssets}
            value={scene.backgroundAssetId}
            onPick={(id) => usw("backgroundAssetId", id)}
            onClose={() => setBgAssetPicker(false)} />
        )}

        <section className="flex-1 min-w-0 min-h-0 overflow-hidden bg-[var(--background)]">
          <div ref={stageRef}
            className="h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,154,92,0.05),transparent_50%),var(--background)]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const assetId = e.dataTransfer.getData("text/rawenchat-asset-id");
              if (!assetId) return;
              const asset = scene.assets.find((a) => a.id === assetId);
              if (!asset || asset.kind === "audio") return;
              const stageEl = stageRef.current;
              if (!stageEl) return;
              const rect = stageEl.getBoundingClientRect();
              const cx = (e.clientX - rect.left - (stageEl.clientWidth / 2 - scene.width * stageScale / 2)) / stageScale;
              const cy = (e.clientY - rect.top  - (stageEl.clientHeight / 2 - scene.height * stageScale / 2)) / stageScale;
              // Pick widget kind based on asset type
              const dropKind = asset.kind === "video" ? "mediaVideo" : "mediaImage";
              addWidget(dropKind);
              void setTimeout(() => {
                const store = useOverlayEditorStore.getState();
                const nw = store.scene.widgets.at(-1);
                if (!nw) return;
                store.updateWidget(nw.id, (w) => ({ ...w, x: Math.max(0, cx - w.width / 2), y: Math.max(0, cy - w.height / 2), assets: { ...w.assets, primaryAssetId: assetId } }));
              }, 0);
            }}
          >
            <div className="h-full w-full flex items-center justify-center p-6">
              <div className="relative shrink-0 shadow-[0_16px_60px_rgba(0,0,0,0.7)]"
                style={{ width: `${scene.width * stageScale}px`, height: `${scene.height * stageScale}px` }}>
                <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${stageScale})` }}>
                  <OverlayCanvas
                    scene={scene} selectedWidgetId={selectedWidgetId} interactive
                    scale={stageScale}
                    onSelectWidget={selectWidget} onWidgetChange={handleWidgetChange}
                    onWidgetAssetDrop={(wid, aid) => updateWidget(wid, (w) => ({ ...w, assets: { ...w.assets, primaryAssetId: aid } }))}
                    className="border border-white/5 rounded-[4px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="w-56 shrink-0 border-l border-[var(--border)] flex flex-col bg-[var(--surface)] overflow-hidden">
          {selectedWidget ? (
            <>
              <div className="px-3 py-2.5 border-b border-[var(--border)] shrink-0 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  Propiedades
                </span>
                <button type="button" onClick={() => selectWidget(null)}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--elevated)] transition-colors">
                  <IconX className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto rawen-scrollbar px-2.5 py-2.5">
                <PropsPanel
                  selectedWidget={selectedWidget} scene={scene}
                  visualAssets={visualAssets} audioAssets={audioAssets}
                  upW={upW} bringForward={bringForward} sendBackward={sendBackward}
                  duplicateWidget={duplicateWidget} removeWidget={removeWidget}
                />
              </div>
            </>
          ) : (
            <>
              <div className="px-3 py-2.5 border-b border-[var(--border)] shrink-0">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  Escena
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto rawen-scrollbar px-2.5 py-2.5 space-y-3">
                <PropSection title="Lienzo">
                  <Field label="Resolución">
                    <Dropdown compact
                      options={OVERLAY_CANVAS_PRESETS.map((p) => ({
                        value: `${p.width}x${p.height}`,
                        label: p.label,
                      }))}
                      value={`${scene.width}x${scene.height}`}
                      onChange={(value) => {
                        const [w, h] = value.split("x").map(Number);
                        setScene((s) => ({ ...s, width: w, height: h }));
                      }} />
                  </Field>
                  <Field label="Fondo">
                    <ColorSwatch value={scene.backgroundColor} onChange={(v) => usw("backgroundColor", v)} />
                  </Field>
                  <Field label="Fondo asset">
                    <AssetPickerButton asset={getAssetById(scene, scene.backgroundAssetId)} placeholder="Ninguno — elegir…" onClick={() => setBgAssetPicker(true)} />
                  </Field>
                  <Field label="Accent widgets">
                    <div className="flex gap-1 items-center">
                      <ColorSwatch
                        value={(scene.widgetAccentColor ?? "") || "#ff9a5c"}
                        onChange={(v) => usw("widgetAccentColor", v)}
                      />
                      {scene.widgetAccentColor && (
                        <button type="button"
                          onClick={() => usw("widgetAccentColor", "")}
                          className="shrink-0 text-[var(--text-muted)] hover:text-white text-[10px] px-1"
                          title="Restablecer al color de cada widget">✕</button>
                      )}
                    </div>
                    {!scene.widgetAccentColor && (
                      <span className="text-[9px] text-[var(--text-muted)]">Usando color de cada widget</span>
                    )}
                  </Field>
                </PropSection>
                <PanelDivider />
                <PropSection title="Vista">
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
                      <input type="checkbox" className="rawen-checkbox" checked={scene.snapToGrid}
                        onChange={(e) => usw("snapToGrid", e.target.checked)} />
                      Snap to grid
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
                      <input type="checkbox" className="rawen-checkbox" checked={scene.showGuides}
                        onChange={(e) => usw("showGuides", e.target.checked)} />
                      Guías
                    </label>
                  </div>
                </PropSection>
                <PanelDivider />
                <Btn full danger onClick={resetScene}>Restablecer escena</Btn>
              </div>
            </>
          )}
        </aside>
      </div>

      {howToOpen && <HowToObsModal scene={scene} onClose={() => setHowToOpen(false)} />}
    </main>
  );
}

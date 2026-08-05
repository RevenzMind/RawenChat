"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ControlBox from "../components/controlbox";
import { OverlayCanvas } from "./OverlayCanvas";
import { getSelectedWidget, useOverlayEditorStore } from "./useOverlayEditorStore";
// Camera streaming is handled globally by CameraStreamBridge in page.tsx
// so OBS keeps receiving frames even when this editor tab is not open.
import { OVERLAY_CANVAS_PRESETS } from "@/constants/overlay";
import { WIDGET_KIND_ORDER, type ConnectionNeed, getWidgetDefinition } from "./widgetRegistry";
import { readLastFmConnection, LASTFM_CONNECTION_CHANGED_EVENT } from "@/utils/lastfm";
import { readTwitchAuth, TWITCH_AUTH_CHANGED_EVENT } from "@/utils/twitch";
import { useOverlayAlerts } from "@/hooks";
import type { OverlayWidget } from "@/types/overlay";
import {
  createOverlayAsset,
  fileToDataUrl,
  getAssetById,
  getOverlayLiveUrl,
  inferAssetKind,
  isOverlayBridgeAvailable,
  OVERLAY_SESSION_CHANGED_EVENT,
} from "@/utils/overlay";
import { getFromStorage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";
import type { OverlaySceneConfig } from "@/types/overlay";

// Sub-components
import { IconChevron, IconPlus, IconX } from "./components/icons";
import { AssetPickerButton } from "./components/AssetPickerButton";
import { AssetPickerPopup } from "./components/AssetPickerPopup";
import { AssetThumb } from "./components/AssetThumb";
import { ColorSwatch } from "./components/ColorSwatch";
import { HowToObsModal } from "./components/HowToObsModal";
import { PanelHeading, PropSection, Field, PanelDivider, Btn } from "./components/ui-primitives";
import { PropsPanel } from "./components/PropsPanel";
import { ScenePanel } from "./components/ScenePanel";
import { inferKindFromUrl } from "./utils/colorUtils";
import Dropdown from "@/app/components/global/Dropdown";

// ─── Helpers ───────────────────────────────────────────────────────────────

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

// La lista y el orden de widgets disponibles viene del registro (widgetRegistry.ts)
const WIDGET_KINDS = WIDGET_KIND_ORDER;

interface OverlayEditorClientProps { embedded?: boolean; }

// ─── Main Component ────────────────────────────────────────────────────────

export default function OverlayEditorClient({ embedded = false }: OverlayEditorClientProps) {
  const {
    scene, scenes, activeSceneId, selectedWidgetId, selectedAssetId,
    initialize, selectWidget, selectAsset, addWidget,
    updateWidget, removeWidget, duplicateWidget, bringForward, sendBackward,
    addAsset, removeAsset, setScene, createScene, switchScene,
    renameScene, duplicateScene, deleteScene, resetScene,
  } = useOverlayEditorStore();

  useOverlayAlerts();

  const selectedWidget = useMemo(
    () => getSelectedWidget(scene, selectedWidgetId),
    [scene, selectedWidgetId],
  );

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
  const [leftTab, setLeftTab] = useState<"scenes" | "widgets">("widgets");

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

  // Al conectar/desconectar Last.fm re-sincroniza la escena al servidor
  useEffect(() => {
    const sync = () => useOverlayEditorStore.getState().saveSettings();
    window.addEventListener(LASTFM_CONNECTION_CHANGED_EVENT, sync);
    return () => window.removeEventListener(LASTFM_CONNECTION_CHANGED_EVENT, sync);
  }, []);

  const missingConnections = useMemo(() => getMissingConnections(scene), [scene, connTick]);
  const missingBanners = useMemo(() => {
    const byNeed = new Map<ConnectionNeed, string[]>();
    for (const m of missingConnections) {
      for (const n of m.needs) byNeed.set(n, [...(byNeed.get(n) ?? []), m.widgetName]);
    }
    return [...byNeed.entries()];
  }, [missingConnections]);

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

  function usw<K extends keyof OverlaySceneConfig>(key: K, value: OverlaySceneConfig[K]) {
    setScene((s) => ({ ...s, [key]: value }));
  }

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
    addAsset(createOverlayAsset({
      name: assetName || assetUrl.split("/").pop() || "asset",
      kind,
      src: assetUrl,
      thumbnailSrc: assetUrl,
    }));
    setAssetUrl(""); setAssetName("");
  }

  function handleWidgetChange(_id: string, widget: OverlayWidget) {
    updateWidget(widget.id, () => widget);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className={`${embedded ? "flex-1 min-h-0" : "h-screen"} bg-[var(--background)] text-white flex flex-col overflow-hidden`}>

      {/* Topbar — standalone window */}
      {!embedded && (
        <header
          className="h-11 shrink-0 flex items-center justify-between border-b border-[var(--border)] px-3 gap-2 bg-[var(--surface)]"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
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
            <Btn accent onClick={() => { void navigator.clipboard.writeText(getOverlayLiveUrl(scene)); setCopied("¡Copiada!"); }}>
              URL OBS
            </Btn>
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
          <Btn onClick={() => window.open(getOverlayLiveUrl(scene), "_blank", "noopener,noreferrer")}>Abrir</Btn>
        </div>
      )}

      {/* Missing connection banners */}
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

        {/* ── Left Sidebar ─────────────────────────────────────────────── */}
        <aside className="w-56 shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--surface)] overflow-hidden">

          {/* Tab bar */}
          <div className="p-2 shrink-0">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--elevated)] p-1">
              {(["scenes", "widgets"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setLeftTab(tab)}
                  className={`h-7 rounded-md text-[11px] font-medium transition-colors ${
                    leftTab === tab
                      ? "bg-[var(--card)] text-white border border-[var(--border)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-white border border-transparent"
                  }`}
                >
                  {tab === "scenes" ? "Escenas" : "Widgets"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto rawen-scrollbar px-2.5 py-1">
            {leftTab === "scenes" && (
              <ScenePanel
                scenes={scenes}
                activeSceneId={activeSceneId}
                onSwitch={switchScene}
                onCreate={createScene}
                onRename={renameScene}
                onDuplicate={duplicateScene}
                onDelete={deleteScene}
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
                    <div
                      key={widget.id}
                      className={`group w-full flex items-center gap-2 px-2 py-2 rounded-lg border transition-colors ${
                        selectedWidgetId === widget.id
                          ? "border-[var(--accent-border)] bg-[var(--accent-muted)]"
                          : "border-transparent hover:border-[var(--border)] hover:bg-[var(--elevated)]"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                        onClick={() => selectWidget(widget.id)}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${widget.visible ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />
                        <span className={`text-xs truncate flex-1 ${selectedWidgetId === widget.id ? "text-white" : "text-[var(--text-secondary)]"}`}>
                          {widget.name}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                          {getWidgetDefinition(widget.kind).label}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
                        className="shrink-0 text-[var(--text-muted)] hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <IconX className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <PanelHeading title="Añadir widget" />
                  <div className="grid grid-cols-1 gap-0.5">
                    {WIDGET_KINDS.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => addWidget(kind)}
                        className="flex items-center gap-2 px-2 py-2 rounded-lg border border-transparent hover:border-[var(--border)] hover:bg-[var(--elevated)] text-[var(--text-muted)] hover:text-white transition-colors text-xs text-left"
                      >
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
            <button
              type="button"
              onClick={() => setAssetsPanelOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-[var(--text-muted)] hover:text-white transition-colors"
            >
              <PanelHeading title="Assets" count={scene.assets.length} />
              <IconChevron open={assetsPanelOpen} className="h-3.5 w-3.5" />
            </button>
            {assetsPanelOpen && (
              <div className="px-2.5 pb-2.5 space-y-2.5 max-h-[240px] overflow-y-auto rawen-scrollbar">
                <div className="flex gap-1.5">
                  <Btn full onClick={() => fileInputRef.current?.click()}>Upload</Btn>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*"
                    className="hidden"
                    onChange={(e) => void handleFiles(e.target.files)}
                  />
                  <input
                    className="amoled-input flex-1 !py-1 text-[11px]"
                    placeholder="https://…"
                    value={assetUrl}
                    onChange={(e) => setAssetUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addFromUrl(); }}
                  />
                </div>
                {visualAssets.length > 0 && (
                  <div className="grid grid-cols-3 gap-1">
                    {visualAssets.map((a) => (
                      <AssetThumb
                        key={a.id}
                        asset={a}
                        selected={selectedAssetId === a.id}
                        onSelect={() => selectAsset(a.id)}
                        onRemove={() => removeAsset(a.id)}
                      />
                    ))}
                  </div>
                )}
                {audioAssets.length > 0 && (
                  <div className="space-y-1">
                    {audioAssets.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => selectAsset(a.id)}
                        className={`group flex items-center gap-2 rounded-lg border px-2 py-1.5 cursor-pointer text-[11px] transition ${
                          selectedAssetId === a.id
                            ? "border-[var(--accent-border)] bg-[var(--accent-muted)] text-white"
                            : "border-[var(--border)] text-[var(--text-muted)] hover:text-white"
                        }`}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                        </svg>
                        <span className="truncate flex-1">{a.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeAsset(a.id); }}
                          className="text-[var(--text-muted)] hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
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

        {/* Background asset picker */}
        {bgAssetPicker && (
          <AssetPickerPopup
            title="Fondo de escena"
            accept="image/*,video/*"
            assets={visualAssets}
            value={scene.backgroundAssetId}
            onPick={(id) => usw("backgroundAssetId", id)}
            onClose={() => setBgAssetPicker(false)}
          />
        )}

        {/* ── Canvas Stage ─────────────────────────────────────────────── */}
        <section className="flex-1 min-w-0 min-h-0 overflow-hidden bg-[var(--background)]">
          <div
            ref={stageRef}
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
              const dropKind = asset.kind === "video" ? "mediaVideo" : "mediaImage";
              addWidget(dropKind);
              void setTimeout(() => {
                const store = useOverlayEditorStore.getState();
                const nw = store.scene.widgets.at(-1);
                if (!nw) return;
                store.updateWidget(nw.id, (w) => ({
                  ...w,
                  x: Math.max(0, cx - w.width / 2),
                  y: Math.max(0, cy - w.height / 2),
                  assets: { ...w.assets, primaryAssetId: assetId },
                }));
              }, 0);
            }}
          >
            <div className="h-full w-full flex items-center justify-center p-6">
              <div
                className="relative shrink-0 shadow-[0_16px_60px_rgba(0,0,0,0.7)]"
                style={{ width: `${scene.width * stageScale}px`, height: `${scene.height * stageScale}px` }}
              >
                <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${stageScale})` }}>
                  <OverlayCanvas
                    scene={scene}
                    selectedWidgetId={selectedWidgetId}
                    interactive
                    scale={stageScale}
                    onSelectWidget={selectWidget}
                    onWidgetChange={handleWidgetChange}
                    onWidgetAssetDrop={(wid, aid) =>
                      updateWidget(wid, (w) => ({ ...w, assets: { ...w.assets, primaryAssetId: aid } }))
                    }
                    className="border border-white/5 rounded-[4px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right Sidebar ─────────────────────────────────────────────── */}
        <aside className="w-56 shrink-0 border-l border-[var(--border)] flex flex-col bg-[var(--surface)] overflow-hidden">
          {selectedWidget ? (
            <>
              <div className="px-3 py-2.5 border-b border-[var(--border)] shrink-0 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  Propiedades
                </span>
                <button
                  type="button"
                  onClick={() => selectWidget(null)}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--elevated)] transition-colors"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto rawen-scrollbar px-2.5 py-2.5">
                <PropsPanel
                  selectedWidget={selectedWidget}
                  scene={scene}
                  visualAssets={visualAssets}
                  audioAssets={audioAssets}
                  upW={upW}
                  bringForward={bringForward}
                  sendBackward={sendBackward}
                  duplicateWidget={duplicateWidget}
                  removeWidget={removeWidget}
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
                    <Dropdown
                      compact
                      options={OVERLAY_CANVAS_PRESETS.map((p) => ({
                        value: `${p.width}x${p.height}`,
                        label: p.label,
                      }))}
                      value={`${scene.width}x${scene.height}`}
                      onChange={(value) => {
                        const [w, h] = value.split("x").map(Number);
                        setScene((s) => ({ ...s, width: w, height: h }));
                      }}
                    />
                  </Field>
                  <Field label="Fondo">
                    <ColorSwatch value={scene.backgroundColor} onChange={(v) => usw("backgroundColor", v)} />
                  </Field>
                  <Field label="Fondo asset">
                    <AssetPickerButton
                      asset={getAssetById(scene, scene.backgroundAssetId)}
                      placeholder="Ninguno — elegir…"
                      onClick={() => setBgAssetPicker(true)}
                    />
                  </Field>
                  <Field label="Accent widgets">
                    <div className="flex gap-1 items-center">
                      <ColorSwatch
                        value={(scene.widgetAccentColor ?? "") || "#ff9a5c"}
                        onChange={(v) => usw("widgetAccentColor", v)}
                      />
                      {scene.widgetAccentColor && (
                        <button
                          type="button"
                          onClick={() => usw("widgetAccentColor", "")}
                          className="shrink-0 text-[var(--text-muted)] hover:text-white text-[10px] px-1"
                          title="Restablecer al color de cada widget"
                        >✕</button>
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
                      <input
                        type="checkbox"
                        className="rawen-checkbox"
                        checked={scene.snapToGrid}
                        onChange={(e) => usw("snapToGrid", e.target.checked)}
                      />
                      Snap to grid
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        className="rawen-checkbox"
                        checked={scene.showGuides}
                        onChange={(e) => usw("showGuides", e.target.checked)}
                      />
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

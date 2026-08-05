"use client";

import { useRef } from "react";
import type { OverlayAsset } from "@/types/overlay";
import { createOverlayAsset, fileToDataUrl, inferAssetKind } from "@/utils/overlay";
import { useOverlayEditorStore } from "@/app/overlay/useOverlayEditorStore";
import { Btn } from "./Btn";

export function AssetThumb({ asset, selected, onSelect, onRemove }: {
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

// Popup para elegir asset: subir de PC o usar uno existente
export function AssetPickerPopup({ title, accept, assets, value, onPick, onClose }: {
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

// Botón plano que muestra el asset actual y abre el popup de selección
export function AssetPickerButton({ asset, placeholder, onClick }: {
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

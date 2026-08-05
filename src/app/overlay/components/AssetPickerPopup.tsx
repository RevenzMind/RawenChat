"use client";

import { useRef } from "react";
import type { OverlayAsset } from "@/types/overlay";
import { createOverlayAsset, fileToDataUrl, inferAssetKind } from "@/utils/overlay";
import { useOverlayEditorStore } from "../useOverlayEditorStore";
import { AssetThumb } from "./AssetThumb";
import { Btn } from "./ui-primitives";

/** Popup para elegir asset desde props: subir de PC o usar uno existente. */
export function AssetPickerPopup({
  title,
  accept,
  assets,
  value,
  onPick,
  onClose,
}: {
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
      <div
        className="w-[360px] max-h-[70vh] flex flex-col rounded-md border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{title}</div>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-3 space-y-3 overflow-y-auto rawen-scrollbar">
          <div className="flex gap-1.5">
            <Btn accent full onClick={() => fileRef.current?.click()}>Elegir de PC</Btn>
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => { void onFile(e.target.files); e.target.value = ""; }}
            />
            <Btn full onClick={() => { onPick(null); onClose(); }}>Ninguno</Btn>
          </div>
          {assets.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {assets.map((a) => (
                <AssetThumb
                  key={a.id}
                  asset={a}
                  selected={a.id === value}
                  onSelect={() => { onPick(a.id); onClose(); }}
                />
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

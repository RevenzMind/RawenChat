"use client";

import type { OverlayAsset } from "@/types/overlay";
import { IconX } from "./icons";

export function AssetThumb({
  asset,
  selected,
  onSelect,
  onRemove,
}: {
  asset: OverlayAsset;
  selected: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/rawenchat-asset-id", asset.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onSelect}
      className={`group relative rounded-[5px] border overflow-hidden cursor-grab active:cursor-grabbing transition-colors ${
        selected ? "border-[var(--accent)]" : "border-[var(--border)]"
      }`}
    >
      {asset.kind === "video" ? (
        <video src={asset.src} className="h-12 w-full object-cover" muted playsInline />
      ) : asset.kind === "audio" ? (
        <div className="h-12 w-full bg-black/30 flex items-center justify-center text-[var(--text-muted)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
          </svg>
        </div>
      ) : (
        <img src={asset.thumbnailSrc || asset.src} alt={asset.name} className="h-12 w-full object-cover" />
      )}
      <div className="px-1 py-0.5 bg-[var(--card)] truncate text-[9px] text-white/70">{asset.name}</div>
      {onRemove && (
        <button
          type="button"
          title={`Eliminar "${asset.name}"`}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-0.5 right-0.5 flex items-center justify-center h-4 w-4 rounded bg-black/70 text-white/70 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

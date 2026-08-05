"use client";

import type { OverlayAsset } from "@/types/overlay";

/** Botón plano que muestra el asset actual y abre el popup de selección. */
export function AssetPickerButton({
  asset,
  placeholder,
  onClick,
}: {
  asset?: OverlayAsset | null;
  placeholder: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-xs text-white hover:border-white/30 transition-colors"
    >
      {asset ? (
        <>
          {asset.kind === "video" ? (
            <video src={asset.src} className="h-6 w-10 rounded object-cover shrink-0" muted playsInline />
          ) : asset.kind === "audio" ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-[var(--text-muted)]">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
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

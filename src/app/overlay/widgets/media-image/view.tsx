import type { WidgetViewProps } from "@/types/overlay";
import { getAssetById } from "@/utils/overlay";

export function MediaImageView({ scene, widget }: WidgetViewProps<"mediaImage">) {
  const asset = getAssetById(scene, widget.assets.primaryAssetId);
  return (
    <div className="h-full w-full overflow-hidden relative"
      style={{ opacity: widget.style.opacity / 100, borderRadius: `${widget.style.borderRadius}px` }}>
      {asset ? (
        <img src={asset.src} alt={asset.name}
          className="h-full w-full"
          style={{ objectFit: widget.data.objectFit }} />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-black/30 border border-dashed border-white/20">
          <span className="text-[0.7em] uppercase tracking-[0.2em] text-white/40">Sin imagen</span>
        </div>
      )}
    </div>
  );
}

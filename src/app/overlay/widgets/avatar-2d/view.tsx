import type { WidgetViewProps } from "@/types/overlay";

export function Avatar2DView({ widget }: WidgetViewProps<"avatar2d">) {
  return (
    <div className="h-full w-full overflow-hidden"
      style={{ opacity: widget.style.opacity / 100, borderRadius: `${widget.style.borderRadius}px` }}>
      <iframe src="/avatar" title="Avatar 2D"
        className="h-full w-full border-0 bg-transparent pointer-events-none" allow="autoplay" />
    </div>
  );
}

"use client";

import type { WidgetViewProps } from "@/types/overlay";
import { DEFAULT_CUSTOM_WIDGET_CODE } from "@/constants/overlay";
import { useCustomRenderableComponent } from "@/hooks";
import { parseCustomWidgetProps } from "@/utils/overlay";

export function CustomTsxView({ widget }: WidgetViewProps<"custom">) {
  const isEmpty = !widget.data.componentCode.trim();
  const CustomComponent = useCustomRenderableComponent(
    isEmpty ? null : widget.data.componentCode,
    DEFAULT_CUSTOM_WIDGET_CODE,
  );
  const props = parseCustomWidgetProps(widget.data.propsJson);

  if (isEmpty) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-2 border border-dashed rounded-[4px]"
        style={{ borderColor: "rgba(255,154,92,0.25)", background: "rgba(255,154,92,0.04)" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,154,92,0.5)" strokeWidth="1.5">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>
        <span style={{ fontSize: 11, color: "rgba(255,154,92,0.5)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Custom Widget
        </span>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden"
      style={{ opacity: widget.style.opacity / 100, borderRadius: `${widget.style.borderRadius}px` }}>
      <CustomComponent {...props} />
    </div>
  );
}

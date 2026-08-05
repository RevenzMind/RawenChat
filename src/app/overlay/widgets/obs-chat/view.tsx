"use client";

import type { WidgetViewProps } from "@/types/overlay";
import { useSessionChannel, useSessionPlatform } from "@/hooks";

export function ObsChatView({ widget, interactive }: WidgetViewProps<"obsChat">) {
  const channel  = useSessionChannel();
  const platform = useSessionPlatform();
  const src = `/obs?channel=${encodeURIComponent(channel)}&platform=${platform}`;
  return (
    <div className="relative h-full w-full overflow-hidden"
      style={{ opacity: widget.style.opacity / 100, borderRadius: `${widget.style.borderRadius}px` }}>
      <iframe key={src} src={src} title={`Chat de ${widget.data.channel || "OBS"}`}
        className="h-full w-full border-0 bg-transparent pointer-events-none" />
      {interactive && !channel ? (
        <div className="absolute inset-0 flex items-center justify-center border border-dashed border-[var(--accent-border)] bg-black/70 px-6 text-center text-sm text-white/70">
          Conecta tu chat (Twitch o Kick) para verlo aquí.
        </div>
      ) : null}
    </div>
  );
}

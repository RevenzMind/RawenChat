"use client";

import type { WidgetViewProps } from "@/types/overlay";
import { getAssetById } from "@/utils/overlay";
import { useSessionChannel, useSessionPlatform } from "@/hooks";
import { getWidgetSurfaceStyle } from "@/utils/widgets";

function StreamCardAvatar({ asset, className }: { asset: { src: string; name: string } | null; className: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden border border-white/10 bg-white/5 ${className}`}>
      {asset ? (
        <img src={asset.src} alt={asset.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/30">
          <svg width="42%" height="42%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function StreamCardView({ scene, widget }: WidgetViewProps<"streamCard">) {
  const channel  = useSessionChannel();
  const platform = useSessionPlatform();
  const asset    = getAssetById(scene, widget.assets.primaryAssetId);
  const isKick   = platform === "kick";
  const platColor = isKick ? "#53fc18" : "#a970ff";
  const variant   = widget.data.variant ?? "classic";
  const showAvatar = widget.data.showAvatar ?? true;
  const name = channel || "sin canal";

  const liveDot = (
    <span className="rounded-full shrink-0"
      style={{ width: "0.32em", height: "0.32em", background: "#ff4a4a", boxShadow: "0 0 6px rgba(255,74,74,0.8)", animation: "pulse-dot 1.6s ease-in-out infinite" }} />
  );

  // Minimalista: solo texto, sin superficie
  if (variant === "minimal") {
    return (
      <div className="h-full w-full flex items-center gap-3 px-2 overflow-hidden"
        style={{ opacity: widget.style.opacity / 100, fontFamily: widget.style.fontFamily, color: widget.style.textColor }}>
        <span className="rounded-full shrink-0"
          style={{ width: "0.45em", height: "0.45em", background: platColor, boxShadow: `0 0 10px ${platColor}` }} />
        <span className="truncate font-semibold" style={{ fontSize: "0.95em", letterSpacing: "0.02em" }}>{name}</span>
        {widget.data.subtitle ? (
          <span className="truncate" style={{ fontSize: "0.68em", color: "rgba(255,255,255,0.45)" }}>· {widget.data.subtitle}</span>
        ) : null}
        <span className="ml-auto">{liveDot}</span>
      </div>
    );
  }

  // Píldora: cápsula redondeada con avatar circular
  if (variant === "pill") {
    return (
      <div className="h-full w-full flex items-center overflow-hidden">
        <div className="h-full min-w-0 flex items-center gap-2.5 rounded-full border pl-1.5 pr-4"
          style={{ ...getWidgetSurfaceStyle(scene, widget), borderRadius: 9999 }}>
          {showAvatar && <StreamCardAvatar asset={asset} className="h-[76%] aspect-square rounded-full" />}
          <span className="truncate font-bold" style={{ fontSize: "0.9em" }}>{name}</span>
          <span className="shrink-0 rounded-[4px] px-1.5 py-[2px] flex items-center gap-1.5"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {liveDot}
            <span style={{ fontSize: "0.5em", fontWeight: 700, letterSpacing: "0.14em", color: platColor, textTransform: "uppercase" }}>
              {isKick ? "Kick" : "Twitch"}
            </span>
          </span>
        </div>
      </div>
    );
  }

  // Clásica: tarjeta completa
  return (
    <div className="h-full w-full border shadow-[0_18px_50px_rgba(0,0,0,0.35)] flex items-center gap-4 px-4 overflow-hidden"
      style={getWidgetSurfaceStyle(scene, widget)}>
      {showAvatar && <StreamCardAvatar asset={asset} className="h-[68%] aspect-square rounded-lg" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="h-[0.35em] w-[0.35em] rounded-full" style={{ background: platColor, boxShadow: `0 0 8px ${platColor}` }} />
          <span style={{ fontSize: "0.6em", color: platColor, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            {isKick ? "Kick" : "Twitch"}
          </span>
        </div>
        <div className="truncate font-bold" style={{ fontSize: "1.05em", letterSpacing: "-0.01em" }}>
          {name}
        </div>
        {widget.data.subtitle ? (
          <div className="truncate" style={{ fontSize: "0.72em", color: "rgba(255,255,255,0.55)" }}>{widget.data.subtitle}</div>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 rounded-[4px] px-2 py-[3px]"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
        {liveDot}
        <span style={{ fontSize: "0.52em", fontWeight: 700, letterSpacing: "0.14em", opacity: 0.75 }}>EN VIVO</span>
      </div>
    </div>
  );
}

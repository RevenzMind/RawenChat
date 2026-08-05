import type { OverlaySceneConfig, OverlayWidget } from "@/types/overlay";
import { getAssetById } from "@/utils/overlay";

export function getAnimationClass(animation: OverlayWidget["style"]["animation"]) {
  if (animation === "slide-up") return "animate-slide-up";
  if (animation === "pulse") return "animate-pulse-dot";
  if (animation === "fade") return "animate-fade-in";
  return "";
}

// Superficie base de la mayoría de widgets: fondo (o imagen del asset primario),
// texto y borde con el accent de la escena.
export function getWidgetSurfaceStyle(scene: OverlaySceneConfig, widget: OverlayWidget) {
  const primaryAsset = getAssetById(scene, widget.assets.primaryAssetId);
  const accentColor = scene.widgetAccentColor?.trim() || widget.style.borderColor;
  return {
    opacity: widget.style.opacity / 100,
    color: widget.style.textColor,
    fontFamily: widget.style.fontFamily,
    fontSize: `${widget.style.fontSize}px`,
    background:
      primaryAsset && (primaryAsset.kind === "image" || primaryAsset.kind === "gif")
        ? `linear-gradient(rgba(0,0,0,0.25),rgba(0,0,0,0.25)),url(${primaryAsset.src}) center/cover no-repeat`
        : widget.style.backgroundColor,
    borderColor: accentColor,
    borderRadius: `${widget.style.borderRadius}px`,
  } as const;
}

// Header por defecto del Chat Box; también es el código inicial del editor de header
export const DEFAULT_HEADER_CODE = `({ title = "Chat", platform = "twitch", borderColor = "rgba(255,154,92,0.32)", backgroundColor = "rgba(5,5,5,0.72)", textColor = "#ffffff", fontFamily = "DM Sans", fontSize = 22 }) => {
  const accent = borderColor || "rgba(255,154,92,0.32)";
  const isKick = String(platform).toLowerCase() === "kick";
  return (
    <div className="h-full w-full flex items-center justify-between px-3.5"
      style={{ background: backgroundColor, borderBottom: \`1px solid \${accent}\`, color: textColor, fontFamily, fontSize: \`\${fontSize}px\` }}>
      <div className="flex items-center gap-2 min-w-0">
        <span style={{
          width: "0.36em", height: "0.36em", borderRadius: "999px",
          background: accent,
          boxShadow: \`0 0 8px \${accent}\`,
          animation: "pulse-dot 2s ease-in-out infinite",
          flexShrink: 0,
        }} />
        <span className="truncate" style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</span>
      </div>
      <span className="flex items-center gap-1.5 shrink-0 rounded-[4px] px-2 py-[3px]"
        style={{ background: "rgba(255,255,255,0.06)", border: \`1px solid rgba(255,255,255,0.1)\` }}>
        <span style={{
          width: "0.3em", height: "0.3em", borderRadius: "999px",
          background: isKick ? "#53fc18" : "#ff4a4a",
          boxShadow: isKick ? "0 0 6px rgba(83,252,24,0.8)" : "0 0 6px rgba(255,74,74,0.8)",
          animation: "pulse-dot 1.6s ease-in-out infinite",
          flexShrink: 0,
        }} />
        <span style={{ fontSize: "0.52em", fontWeight: 700, letterSpacing: "0.14em", opacity: 0.75 }}>
          {isKick ? "KICK" : "LIVE"}
        </span>
      </span>
    </div>
  );
}`;

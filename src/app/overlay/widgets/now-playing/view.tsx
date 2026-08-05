"use client";

import type { WidgetViewProps } from "@/types/overlay";
import { useLastFmTrack } from "@/hooks";
import { getWidgetSurfaceStyle } from "@/utils/widgets";

function NowPlayingBars({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 12 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-[3px] rounded-full"
          style={{ background: accentColor, height: `${50 + i * 25}%`,
            animation: `now-playing-bar ${0.8 + i * 0.15}s ease-in-out infinite alternate` }} />
      ))}
    </div>
  );
}

export function NowPlayingView({ scene, widget, interactive }: WidgetViewProps<"nowPlaying">) {
  const { layout, showAlbumArt, lastfmApiKey, lastfmUsername } = widget.data;
  // En OBS/live pueden llegar credenciales inyectadas en la escena
  const { track, apiKey, username } = useLastFmTrack({
    interactive,
    widgetApiKey: lastfmApiKey,
    widgetUsername: lastfmUsername,
  });

  const surfaceStyle = getWidgetSurfaceStyle(scene, widget);
  const accentColor  = scene.widgetAccentColor?.trim() || widget.style.borderColor;

  if (!apiKey || !username) {
    return (
      <div className="h-full w-full border flex items-center justify-center gap-2 px-4"
        style={{ ...surfaceStyle, borderStyle: "dashed" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,154,92,0.5)" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {interactive ? "Conecta Last.fm en Ajustes → Conexiones" : ""}
        </span>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="h-full w-full border flex items-center justify-center gap-2 px-4"
        style={surfaceStyle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,154,92,0.4)" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="10 8 16 12 10 16 10 8" fill="rgba(255,154,92,0.4)" stroke="none"/>
        </svg>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Nada reproduciéndose
        </span>
      </div>
    );
  }

  if (layout === "compact") {
    return (
      <div className="h-full w-full border overflow-hidden flex items-center gap-3 px-3" style={surfaceStyle}>
        {showAlbumArt && track.albumArt && (
          <img src={track.albumArt} alt={track.album}
            className="shrink-0 rounded-[6px] object-cover"
            style={{ width: 64, height: 64, minWidth: 64, boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }} />
        )}
        <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <NowPlayingBars accentColor={accentColor} />
            <span style={{ fontSize: "0.6em", color: accentColor, textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 600 }}>
              Last.fm
            </span>
          </div>
          <div className="truncate font-semibold leading-tight" style={{ fontSize: "0.85em" }}>{track.title}</div>
          <div className="truncate" style={{ fontSize: "0.68em", color: "rgba(255,255,255,0.55)" }}>{track.artist}</div>
        </div>
      </div>
    );
  }

  // Layout completo con carátula destacada
  return (
    <div className="h-full w-full border overflow-hidden flex flex-col" style={surfaceStyle}>
      {showAlbumArt && track.albumArt && (
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <img src={track.albumArt} alt={track.album}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "blur(18px) brightness(0.4)", transform: "scale(1.15)" }} />
          <img src={track.albumArt} alt={track.album}
            className="relative z-10 h-full object-contain mx-auto"
            style={{ maxWidth: "45%", padding: "8%", filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.6))" }} />
        </div>
      )}
      <div className="shrink-0 px-4 pb-3 pt-2">
        <div className="flex items-center gap-1.5 mb-1">
          <NowPlayingBars accentColor={accentColor} />
          <span style={{ fontSize: "0.6em", color: accentColor, textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 600 }}>
            Last.fm
          </span>
        </div>
        <div className="font-semibold leading-tight truncate" style={{ fontSize: "0.95em" }}>{track.title}</div>
        <div className="truncate" style={{ fontSize: "0.72em", color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{track.artist}</div>
      </div>
    </div>
  );
}

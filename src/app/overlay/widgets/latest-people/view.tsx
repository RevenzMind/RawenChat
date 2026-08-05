"use client";

import { useEffect, useState } from "react";
import type { OverlayAlert, WidgetViewProps } from "@/types/overlay";
import { useSessionChannel, useSessionPlatform } from "@/hooks";
import { TWITCH_CLIENT_ID, readTwitchAuth } from "@/utils/twitch";
import { OVERLAY_ALERT_EVENT } from "@/utils/alerts";
import { getWidgetSurfaceStyle } from "@/utils/widgets";

// Últimos follower/subscriber/donador: persistidos para sobrevivir recargas
// y compartidos entre la app y OBS (mismo origen = mismo localStorage).
const LATEST_PEOPLE_STORAGE = "rawenchat_latest_people";
type LatestPeopleEntry = { user: string; count: number; kind: string };

function readLatestPeople(): Record<string, LatestPeopleEntry> {
  try {
    const parsed = JSON.parse(localStorage.getItem(LATEST_PEOPLE_STORAGE) || "{}") as Record<string, LatestPeopleEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function LatestPeopleView({ scene, widget }: WidgetViewProps<"subscriberTicker">) {
  const channel = useSessionChannel();
  const platform = useSessionPlatform();
  const mode = widget.data.mode ?? "follow";
  const [entry, setEntry] = useState<LatestPeopleEntry | null>(() => readLatestPeople()[mode] ?? null);

  // Se alimenta de las alertas del canal y persiste el último de cada categoría;
  // además siembra el historial real de Twitch donde existe endpoint para ello.
  useEffect(() => {
    let active = true;
    setEntry(readLatestPeople()[mode] ?? null);
    const apply = (next: LatestPeopleEntry) => {
      const all = readLatestPeople();
      all[mode] = next;
      try { localStorage.setItem(LATEST_PEOPLE_STORAGE, JSON.stringify(all)); } catch {}
      setEntry(next);
    };

    const onAlert = (e: Event) => {
      const alert = (e as CustomEvent<OverlayAlert>).detail;
      if (!alert?.kind) return;
      const matches =
        (mode === "follow" && alert.kind === "follow") ||
        (mode === "subscribe" && (alert.kind === "subscribe" || alert.kind === "gift")) ||
        (mode === "donators" && alert.kind === "cheer");
      if (!matches) return;
      apply({ user: alert.user || "Alguien", count: alert.count || 1, kind: alert.kind });
    };
    window.addEventListener(OVERLAY_ALERT_EVENT, onAlert);

    async function seed() {
      // Subs no tienen endpoint con fecha; se llenan solo con eventos en vivo
      if (platform !== "twitch" || !channel || mode === "subscribe") return;
      const auth = readTwitchAuth();
      if (!auth?.accessToken) return;
      try {
        const headers = { "Client-Id": TWITCH_CLIENT_ID, Authorization: `Bearer ${auth.accessToken}` };
        const uRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(channel)}`, { headers });
        const userId = (await uRes.json())?.data?.[0]?.id as string | undefined;
        if (!userId || !active) return;
        if (mode === "follow") {
          const res = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}&first=1`, { headers });
          const latest = (await res.json())?.data?.[0] as { user_name?: string } | undefined;
          if (active && latest?.user_name) apply({ user: latest.user_name, count: 1, kind: "follow" });
        } else if (mode === "donators") {
          // Sin endpoint de "último cheer": el top del periodo más corto disponible
          for (const period of ["day", "week", "month", "all"]) {
            const res = await fetch(`https://api.twitch.tv/helix/bits/leaderboard?count=1&period=${period}`, { headers });
            const top = (await res.json())?.data?.[0] as { user_name?: string; value?: number } | undefined;
            if (top?.user_name) {
              if (active) apply({ user: top.user_name, count: top.value ?? 0, kind: "cheer" });
              return;
            }
          }
        }
      } catch {}
    }
    void seed();

    return () => { active = false; window.removeEventListener(OVERLAY_ALERT_EVENT, onAlert); };
  }, [mode, channel, platform]);

  const defaultLabel = mode === "follow" ? "Latest followers" : mode === "subscribe" ? "Latest subscribers" : "Latest donators";
  // "People" era el label por defecto del antiguo Custom People: se trata como vacío
  const rawLabel = (widget.data.label ?? "").trim();
  const label = rawLabel && rawLabel !== "People" ? rawLabel : defaultLabel;
  return (
    <div className="h-full w-full border shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden flex items-center justify-between px-4"
      style={getWidgetSurfaceStyle(scene, widget)}>
      <div>
        <div className="uppercase tracking-[0.28em] text-[0.68em] text-white/60">{label}</div>
        <div className="text-[1.3em] font-semibold leading-tight">{entry?.user ?? ""}</div>
      </div>
      {entry && (mode === "donators" || entry.count > 1) && (
        <div className="text-[1.05em] font-semibold text-white/80 shrink-0">
          +{entry.count}{mode === "donators" ? " bits" : entry.kind === "gift" ? " subs" : ""}
        </div>
      )}
    </div>
  );
}

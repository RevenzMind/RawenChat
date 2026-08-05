"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AlertEventKind, OverlayAlert, WidgetViewProps } from "@/types/overlay";
import { getAssetById } from "@/utils/overlay";
import {
  ALERT_EVENT_LABELS,
  OVERLAY_ALERT_EVENT,
  buildTestAlert,
  claimAlertSound,
  formatAlertTemplate,
  sanitizeAlertData,
} from "@/utils/alerts";
import { getWidgetSurfaceStyle } from "@/utils/widgets";

export function AlertView({ scene, widget, interactive }: WidgetViewProps<"alert">) {
  // Sanitizado: widgets guardados con el modelo viejo no traen events/templates
  const data = sanitizeAlertData(widget.data);
  const [current, setCurrent] = useState<OverlayAlert | null>(null);
  const [preview, setPreview] = useState<OverlayAlert | null>(null);
  const queueRef = useRef<OverlayAlert[]>([]);
  const showingRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const pump = useCallback(() => {
    if (showingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    showingRef.current = true;
    setCurrent(next);
    const secs = Math.max(2, dataRef.current.duration || 6);
    window.setTimeout(() => {
      showingRef.current = false;
      setCurrent(null);
      pump();
    }, secs * 1000);
  }, []);

  useEffect(() => {
    const onAlert = (e: Event) => {
      const alert = (e as CustomEvent<OverlayAlert>).detail;
      if (!alert?.kind) return;
      if (!dataRef.current.events[alert.kind]) return;
      queueRef.current.push(alert);
      pump();
    };
    window.addEventListener(OVERLAY_ALERT_EVENT, onAlert);
    return () => window.removeEventListener(OVERLAY_ALERT_EVENT, onAlert);
  }, [pump]);

  // Preview del editor: rota muestras de cada evento activo para que siempre
  // se vea como quedaría en stream; al probar, la alerta real la reemplaza.
  const enabledKindsKey = (Object.keys(ALERT_EVENT_LABELS) as AlertEventKind[])
    .filter((k) => data.events[k]).join(",");
  useEffect(() => {
    if (!interactive) return;
    const kinds = enabledKindsKey ? (enabledKindsKey.split(",") as AlertEventKind[]) : [];
    if (!kinds.length) { setPreview(null); return; }
    let i = 0;
    setPreview(buildTestAlert(kinds[0]));
    const t = window.setInterval(() => {
      i = (i + 1) % kinds.length;
      setPreview(buildTestAlert(kinds[i]));
    }, 4000);
    return () => window.clearInterval(t);
  }, [interactive, enabledKindsKey]);

  // Sonido solo en la app (canvas interactivo); el overlay de OBS no reproduce sonido.
  useEffect(() => {
    if (!current) return;
    if (!interactive) return;   // OBS overlay: nunca suena
    if (!claimAlertSound(current)) return;
    const sound = getAssetById(scene, dataRef.current.soundAssetId);
    if (!sound) return;
    const audio = new Audio(sound.src);
    audio.volume = Math.min(1, Math.max(0, (dataRef.current.soundVolume ?? 80) / 100));
    void audio.play().catch(() => {});
  }, [current, scene, interactive]);

  const shown = current ?? (interactive ? preview : null);
  const media = getAssetById(scene, data.mediaAssetId);
  const showMedia = data.mediaKind !== "none" && media &&
    (data.mediaKind === "video" ? media.kind === "video" : media.kind === "image" || media.kind === "gif");

  const text = shown ? formatAlertTemplate(data.templates[shown.kind] ?? "", shown) : "";
  const label = shown ? ALERT_EVENT_LABELS[shown.kind] : "";

  const surface = getWidgetSurfaceStyle(scene, widget);

  if (!shown) {
    return interactive ? (
      <div className="h-full w-full rounded-md border border-dashed border-white/15 flex items-center justify-center text-[0.8em] text-white/40">
        Las alertas de Twitch aparecerán aquí
      </div>
    ) : (
      <div className="h-full w-full" />
    );
  }

  const textInner = (
    <div>
      <div className="text-[0.72em] uppercase tracking-[0.28em] text-white/55 mb-1">{label}</div>
      <div className="text-[1.05em] font-semibold leading-snug" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>{text}</div>
    </div>
  );
  const textBlock = <div className="min-w-0 w-full text-center">{textInner}</div>;

  const mediaKey = (media?.src ?? "") + (shown.user ?? "");
  const mediaCover = showMedia && media && (
    data.mediaKind === "video" ? (
      <video key={mediaKey} src={media.src} autoPlay muted playsInline loop className="absolute inset-0 h-full w-full object-cover" />
    ) : (
      <img key={media.src} src={media.src} alt={media.name} className="absolute inset-0 h-full w-full object-cover" />
    )
  );
  const mediaBox = showMedia && media && (
    data.mediaKind === "video" ? (
      <video key={mediaKey} src={media.src} autoPlay muted playsInline loop className="max-h-[62%] max-w-full object-contain rounded-md" />
    ) : (
      <img key={media.src} src={media.src} alt={media.name} className="max-h-[62%] max-w-full object-contain rounded-md" />
    )
  );

  // Centrado: media de fondo + texto encima
  if (data.textPosition === "center") {
    return (
      <div className="relative h-full w-full border shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden" style={surface}>
        {mediaCover}
        <div className="absolute inset-0 flex items-center justify-center text-center px-3">{textInner}</div>
      </div>
    );
  }

  // Arriba/abajo: orden real del texto respecto a la media
  return (
    <div className="relative h-full w-full border shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col items-center justify-center gap-2 px-4 py-3"
      style={surface}>
      {data.textPosition === "top" && textBlock}
      {mediaBox}
      {data.textPosition === "bottom" && textBlock}
    </div>
  );
}

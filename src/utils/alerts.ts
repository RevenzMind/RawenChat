import type { AlertEventKind, OverlayAlert, OverlaySettings, OverlayWidget } from "@/types/overlay";
import { STORAGE_KEYS } from "@/constants/config";
import { getFromStorage } from "./storage";
import { readTwitchAuth, TWITCH_CLIENT_ID } from "./twitch";

export const BRIDGE_HTTP_BASE = "http://127.0.0.1:3003";
export const OVERLAY_SESSION_SERVER_URL = `${BRIDGE_HTTP_BASE}/overlay-session`;
export const OVERLAY_ALERT_SERVER_URL = `${BRIDGE_HTTP_BASE}/overlay-alert`;
export const ALERT_ENGINE_CONFIG_URL = `${BRIDGE_HTTP_BASE}/alert-config`;
/** Receptor webhook para pruebas con Twitch CLI (event trigger --forward-address). */
export const ALERT_WEBHOOK_URL = `${BRIDGE_HTTP_BASE}/eventsub/webhook`;

/** Evento de window que distribuye alertas a todos los canvas (editor, live, preview). */
export const OVERLAY_ALERT_EVENT = "rawenchat-overlay-alert";

// Hay varios canvas en la misma ventana (editor + previews): solo uno
// debe reproducir el sonido de cada alerta. Estado en window por el HMR.
export function claimAlertSound(alert: OverlayAlert): boolean {
  const key = `${alert.kind}|${alert.user}|${alert.count}`;
  const w = globalThis as unknown as { __rawenchat_last_sound__?: { key: string; at: number } };
  const now = Date.now();
  if (w.__rawenchat_last_sound__ && w.__rawenchat_last_sound__.key === key && now - w.__rawenchat_last_sound__.at < 1500) return false;
  w.__rawenchat_last_sound__ = { key, at: now };
  return true;
}

/** Un solo TTS por alerta aunque haya listeners duplicados (HMR). */
export function claimAlertTts(alert: OverlayAlert): boolean {
  const key = `${alert.kind}|${alert.user}|${alert.count}|${alert.test ? 1 : 0}`;
  const w = globalThis as unknown as Record<string, number | undefined>;
  const stamp = `__rawenchat_tts_claim__${key}`;
  const now = Date.now();
  if (w[stamp] && now - (w[stamp] as number) < 5000) return false;
  w[stamp] = now;
  return true;
}

export const ALERT_EVENT_LABELS: Record<AlertEventKind, string> = {
  follow: "Follow",
  subscribe: "Sub",
  gift: "Gift sub",
  raid: "Raid",
  cheer: "Bits",
};

export const DEFAULT_ALERT_TEMPLATES: Record<AlertEventKind, string> = {
  follow: "{user} te siguió",
  subscribe: "{user} se suscribió",
  gift: "{user} regaló {count} subs",
  raid: "{user} llegó con {count} viewers",
  cheer: "{user} apoyó con {count} bits",
};

export type AlertWidgetData = Extract<OverlayWidget, { kind: "alert" }>["data"];

const DEFAULT_ALERT_EVENTS: Record<AlertEventKind, boolean> = {
  follow: true, subscribe: true, gift: true, raid: true, cheer: true,
};

/**
 * Completa datos de widgets de alerta guardados antes del nuevo modelo.
 * Sin esto, un widget viejo sin `events` revienta el listener y no sale nada.
 */
export function sanitizeAlertData(raw: Partial<AlertWidgetData> | null | undefined): AlertWidgetData {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    events: { ...DEFAULT_ALERT_EVENTS, ...(src.events ?? {}) },
    templates: { ...DEFAULT_ALERT_TEMPLATES, ...(src.templates ?? {}) },
    mediaKind: src.mediaKind === "image" || src.mediaKind === "video" ? src.mediaKind : "none",
    mediaAssetId: typeof src.mediaAssetId === "string" ? src.mediaAssetId : null,
    soundAssetId: typeof src.soundAssetId === "string" ? src.soundAssetId : null,
    soundVolume: typeof src.soundVolume === "number" ? src.soundVolume : 80,
    soundInEditor: Boolean(src.soundInEditor),
    ttsEnabled: Boolean(src.ttsEnabled),
    ttsAfterSound: src.ttsAfterSound !== false,
    textPosition: src.textPosition === "top" || src.textPosition === "center" ? src.textPosition : "bottom",
    duration: typeof src.duration === "number" && src.duration >= 2 ? src.duration : 6,
  };
}

export function formatAlertTemplate(template: string, alert: OverlayAlert): string {
  return template
    .replaceAll("{user}", alert.user || "Alguien")
    .replaceAll("{count}", String(alert.count || 1));
}

// Estado dedupe en window: sobrevive a instancias duplicadas del módulo por HMR,
// que si no, dejan pasar la misma alerta dos veces.
function globalSet(key: string): Set<string> {
  const w = globalThis as unknown as Record<string, Set<string> | undefined>;
  if (!w[key]) w[key] = new Set();
  return w[key]!;
}

// En la ventana principal pueden convivir varios sockets (home + editor embebido);
// deduplicamos para no pintar ni locutar la misma alerta dos veces.
export function dispatchOverlayAlert(alert: OverlayAlert): void {
  if (typeof window === "undefined") return;
  const key = `${alert.kind}|${alert.platform}|${alert.user}|${alert.count}|${alert.test ? 1 : 0}`;
  const recent = globalSet("__rawenchat_recent_alerts__");
  if (recent.has(key)) return;
  recent.add(key);
  window.setTimeout(() => recent.delete(key), 500);
  window.dispatchEvent(new CustomEvent<OverlayAlert>(OVERLAY_ALERT_EVENT, { detail: alert }));
}

/** Envía una alerta al bridge para que la reciban TODOS los clientes (OBS incluido). */
export async function sendOverlayAlertToBridge(alert: OverlayAlert): Promise<void> {
  try {
    await fetch(OVERLAY_ALERT_SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert),
      cache: "no-store",
    });
  } catch {
    // Bridge apagado: sin alertas remotas
  }
}

const TEST_ALERT_SAMPLES: Record<AlertEventKind, { user: string; count: number }> = {
  follow: { user: "RawenCat", count: 1 },
  subscribe: { user: "RawenCat", count: 1 },
  gift: { user: "RawenCat", count: 5 },
  raid: { user: "RawenCat", count: 42 },
  cheer: { user: "RawenCat", count: 100 },
};

/** Alerta de ejemplo: la usa el preview rotativo del editor y el botón Probar. */
export function buildTestAlert(kind: AlertEventKind): OverlayAlert {
  const sample = TEST_ALERT_SAMPLES[kind];
  return { kind, platform: "twitch", user: sample.user, count: sample.count, test: true };
}

/** Alerta de prueba de un evento: la ven editor, home (TTS) y OBS. */
export function sendTestAlert(kind: AlertEventKind): Promise<void> {
  return sendOverlayAlertToBridge(buildTestAlert(kind));
}

export interface AlertEngineConfig {
  clientId: string;
  accessToken: string;
  userId: string;
  events: AlertEventKind[];
}

/** Le dice al bridge qué conexión EventSub mantener viva. */
export async function pushAlertEngineConfig(config: AlertEngineConfig | null): Promise<void> {
  try {
    await fetch(ALERT_ENGINE_CONFIG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
      cache: "no-store",
    });
  } catch {
    // Bridge apagado
  }
}

const ALL_ALERT_EVENTS: AlertEventKind[] = ["follow", "subscribe", "gift", "raid", "cheer"];

/** Une los eventos activos de todos los widgets de alerta de todas las escenas. */
export function collectEnabledAlertEvents(settings: OverlaySettings | null): AlertEventKind[] {
  const enabled = new Set<AlertEventKind>();
  for (const scene of settings?.scenes ?? []) {
    for (const widget of scene.widgets) {
      if (widget.kind !== "alert") continue;
      for (const kind of ALL_ALERT_EVENTS) {
        if (widget.data.events?.[kind]) enabled.add(kind);
      }
    }
  }
  return [...enabled];
}

/**
 * Recalcula y publica la config del motor EventSub en el bridge.
 * Solo Twitch tiene alertas: con Kick o sin sesión manda null (motor apagado).
 */
export async function refreshAlertEngineConfig(): Promise<void> {
  const auth = readTwitchAuth();
  const platform = getFromStorage<string>(STORAGE_KEYS.LAST_PLATFORM);
  const channel = getFromStorage<string>(STORAGE_KEYS.LAST_CHANNEL)?.trim();
  if (!auth?.accessToken || !auth.userId || platform !== "twitch" || !channel) {
    await pushAlertEngineConfig(null);
    return;
  }
  const settings = getFromStorage<OverlaySettings>(STORAGE_KEYS.OVERLAY_SETTINGS);
  await pushAlertEngineConfig({
    clientId: auth.clientId || TWITCH_CLIENT_ID,
    accessToken: auth.accessToken,
    userId: auth.userId,
    events: collectEnabledAlertEvents(settings),
  });
}

export interface OverlaySessionInfo {
  channel: string;
  platform: "twitch" | "kick";
}

/** Publica la sesión actual en el bridge para que OBS la reciba al instante. */
export async function pushOverlaySessionToBridge(session: OverlaySessionInfo): Promise<void> {
  try {
    await fetch(OVERLAY_SESSION_SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
      cache: "no-store",
    });
  } catch {
    // Bridge apagado
  }
}

export async function readOverlaySessionFromBridge(): Promise<OverlaySessionInfo | null> {
  try {
    const res = await fetch(OVERLAY_SESSION_SERVER_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as OverlaySessionInfo | null;
    if (!data || typeof data.channel !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

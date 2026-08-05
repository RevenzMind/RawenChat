import {
  DEFAULT_CUSTOM_WIDGET_CODE,
  DEFAULT_OVERLAY_SCENE,
  DEFAULT_WIDGET_STYLE,
  OVERLAY_SCENE_ID,
} from "@/constants/overlay";
import { STORAGE_KEYS } from "@/constants/config";
import { readLastFmConnection } from "@/utils/lastfm";
import type {
  OverlayAsset,
  OverlayAssetKind,
  OverlaySceneConfig,
  OverlaySettings,
  OverlayWidget,
  OverlayWidgetKind,
} from "@/types/overlay";
import { getFromStorage, saveToStorage } from "@/utils/storage";
import { BRIDGE_CHANNELS } from "@/utils/socket";
import { pushOverlaySessionToBridge, refreshAlertEngineConfig } from "@/utils/alerts";
import { getWidgetDefinition } from "@/app/overlay/widgets/registry";

const encoder = typeof window === "undefined" ? null : new TextEncoder();
const decoder = typeof window === "undefined" ? null : new TextDecoder();

export const OVERLAY_SCENE_SERVER_URL = "http://127.0.0.1:3003/overlay-scene";
export const OVERLAY_SETTINGS_SERVER_URL = "http://127.0.0.1:3003/overlay-settings";
export const OVERLAY_SCENE_WS_URL = BRIDGE_CHANNELS.overlay;
const OVERLAY_SERVER_SYNC_DELAY_MS = 60;
const OVERLAY_SETTINGS_SYNC_DELAY_MS = 400;

export interface OverlaySceneServerRecord {
  revision: number;
  scene: OverlaySceneConfig;
}

let overlayServerSyncTimer: number | null = null;
let overlaySettingsSyncTimer: number | null = null;
let overlayPublisherReconnectTimer: number | null = null;
let overlayPublisherSocket: WebSocket | null = null;
let pendingServerScene: OverlaySceneConfig | null = null;
let pendingSettings: OverlaySettings | null = null;

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function cloneScene(scene: OverlaySceneConfig) {
  return JSON.parse(JSON.stringify(scene)) as OverlaySceneConfig;
}

export function createDefaultScene() {
  const scene = cloneScene(DEFAULT_OVERLAY_SCENE);
  scene.updatedAt = new Date().toISOString();
  return scene;
}

export function readStoredOverlayScene() {
  return getFromStorage<OverlaySceneConfig>(STORAGE_KEYS.OVERLAY_SCENE);
}

export function readOverlayScene() {
  return readStoredOverlayScene() || createDefaultScene();
}

export function writeOverlayScene(scene: OverlaySceneConfig) {
  saveToStorage(STORAGE_KEYS.OVERLAY_SCENE, scene);
}

async function persistOverlaySceneToServer(scene: OverlaySceneConfig): Promise<void> {
  try {
    await fetch(OVERLAY_SCENE_SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scene),
      cache: "no-store",
    });
  } catch {
    // Bridge not running — changes will sync next time it starts
  }
}

function connectOverlayPublisher(): WebSocket | null {
  if (
    overlayPublisherSocket &&
    (overlayPublisherSocket.readyState === WebSocket.OPEN ||
      overlayPublisherSocket.readyState === WebSocket.CONNECTING)
  ) {
    return overlayPublisherSocket;
  }

  try {
    const socket = new WebSocket(OVERLAY_SCENE_WS_URL);
    overlayPublisherSocket = socket;
    socket.onopen = () => {
      if (!pendingServerScene) return;
      socket.send(
        JSON.stringify({ type: "UPDATE_OVERLAY_SCENE", scene: pendingServerScene }),
      );
      pendingServerScene = null;
    };
    socket.onclose = () => {
      if (overlayPublisherSocket === socket) overlayPublisherSocket = null;
      if (pendingServerScene && overlayPublisherReconnectTimer === null) {
        overlayPublisherReconnectTimer = window.setTimeout(() => {
          overlayPublisherReconnectTimer = null;
          connectOverlayPublisher();
        }, 1500);
      }
    };
    socket.onerror = () => socket.close();
    return socket;
  } catch {
    return null;
  }
}

function publishOverlayScene(scene: OverlaySceneConfig): void {
  pendingServerScene = scene;
  const socket = connectOverlayPublisher();
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "UPDATE_OVERLAY_SCENE", scene }));
    pendingServerScene = null;
  }

  // HTTP keeps synchronization working when WebSocket traffic is blocked.
  void persistOverlaySceneToServer(scene);
}

function scheduleOverlayServerSync(scene: OverlaySceneConfig): void {
  pendingServerScene = scene;
  if (overlayServerSyncTimer !== null) {
    window.clearTimeout(overlayServerSyncTimer);
  }
  overlayServerSyncTimer = window.setTimeout(() => {
    const nextScene = pendingServerScene;
    overlayServerSyncTimer = null;
    if (nextScene) publishOverlayScene(nextScene);
  }, OVERLAY_SERVER_SYNC_DELAY_MS);
}

export async function readOverlaySceneRecordFromServer(): Promise<OverlaySceneServerRecord | null> {
  try {
    const response = await fetch(OVERLAY_SCENE_SERVER_URL, { cache: "no-store" });
    if (!response.ok) return null;
    const record = (await response.json()) as OverlaySceneServerRecord | null;
    if (!record?.scene || !Number.isFinite(record.revision)) return null;
    return record;
  } catch {
    return null;
  }
}

export async function isOverlayBridgeAvailable(): Promise<boolean> {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3000";
    const url = OVERLAY_SCENE_SERVER_URL.startsWith("http")
      ? OVERLAY_SCENE_SERVER_URL
      : `${base}${OVERLAY_SCENE_SERVER_URL}`;
    const response = await fetch(url, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

// Persistent BroadcastChannel for the editor side — created once and kept
// open so postMessage is never dropped due to immediate close().
let editorBroadcastChannel: BroadcastChannel | null = null;
function getEditorChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!("BroadcastChannel" in window)) return null;
  if (!editorBroadcastChannel) {
    editorBroadcastChannel = new BroadcastChannel(STORAGE_KEYS.OVERLAY_SCENE);
  }
  return editorBroadcastChannel;
}

export function broadcastOverlayScene(scene: OverlaySceneConfig) {
  if (typeof window === "undefined") return;
  // La sesión se estampa aquí para que llegue a OBS (contexto sin localStorage compartido)
  const stamped = stampSceneWithSession(scene);
  writeOverlayScene(stamped);
  scheduleOverlayServerSync(stamped);
  window.dispatchEvent(new CustomEvent("rawenchat-overlay-scene", { detail: stamped }));
  getEditorChannel()?.postMessage(stamped);
}

/** Copia la escena con el canal/plataforma de la sesión actual incrustados. */
function stampSceneWithSession(scene: OverlaySceneConfig): OverlaySceneConfig {
  const channel = getFromStorage<string>(STORAGE_KEYS.LAST_CHANNEL)?.trim() ?? "";
  const platform = getFromStorage<"twitch" | "kick">(STORAGE_KEYS.LAST_PLATFORM);
  return {
    ...scene,
    sessionChannel: channel,
    sessionPlatform: platform === "kick" ? "kick" : "twitch",
  };
}

/** Evento de window que avisa que la sesión de chat (canal/plataforma) cambió. */
export const OVERLAY_SESSION_CHANGED_EVENT = "rawenchat-overlay-session";

/**
 * Reemite la escena activa con la sesión recién cambiada (conectar,
 * desconectar o alternar Twitch/Kick) para que OBS se entere al instante.
 * Se actualiza `updatedAt` porque el bridge descarta escenas con timestamp
 * menor o igual a la última guardada — sin esto OBS nunca se refresca.
 */
export function notifyOverlaySessionChanged(): void {
  if (typeof window === "undefined") return;
  // Para que la misma ventana (editor) se entere al instante de conectar/desconectar
  window.dispatchEvent(new Event(OVERLAY_SESSION_CHANGED_EVENT));
  // Canal dedicado en el bridge: OBS lo recibe al instante, sin depender del
  // timestamp de la escena ni de que existan escenas guardadas.
  const channel = getFromStorage<string>(STORAGE_KEYS.LAST_CHANNEL)?.trim() ?? "";
  const platform = getFromStorage<"twitch" | "kick">(STORAGE_KEYS.LAST_PLATFORM) === "kick" ? "kick" : "twitch";
  void pushOverlaySessionToBridge({ channel, platform });

  const settings = readStoredOverlaySettings();
  const scene =
    settings?.scenes.find((s) => s.id === settings.activeSceneId) ?? settings?.scenes[0];
  if (!scene) return;
  const refreshed = { ...scene, updatedAt: new Date().toISOString() };
  // Persistir el bump también en local para que el editor y el poll coincidan
  if (settings) {
    writeOverlaySettings({
      ...settings,
      scenes: settings.scenes.map((s) => (s.id === refreshed.id ? refreshed : s)),
    });
  }
  broadcastOverlayScene(refreshed);
}

export function readSceneFromQuery(encodedConfig: string | null) {
  if (!encodedConfig) return null;
  try {
    if (!encoder || !decoder) return null;
    const normalized = encodedConfig.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = decoder.decode(bytes);
    return JSON.parse(json) as OverlaySceneConfig;
  } catch {
    return null;
  }
}

export function encodeSceneForUrl(scene: OverlaySceneConfig) {
  if (!encoder) return "";
  const json = JSON.stringify(scene);
  const bytes = encoder.encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function getOverlayLiveUrl(scene: OverlaySceneConfig) {
  if (typeof window === "undefined") return "";
  const origin = window.electron?.isElectron
    ? "http://127.0.0.1:3000"
    : window.location.origin;
  const url = new URL("/overlay/live", origin);
  // El nombre de la escena va en la URL (legible); los ids viejos siguen funcionando
  url.searchParams.set("scene", scene.name);
  return url.toString();
}

/** "Talking Head" → "talkinghead" — para resolver URLs escritas a mano. */
export function normalizeSceneName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Una escena coincide con el param por id o por nombre normalizado. */
export function sceneMatchesParam(scene: { id: string; name: string }, param: string | null): boolean {
  if (!param) return false;
  return scene.id === param || normalizeSceneName(scene.name) === normalizeSceneName(param);
}

export function readStoredOverlaySettings(): OverlaySettings | null {
  return getFromStorage<OverlaySettings>(STORAGE_KEYS.OVERLAY_SETTINGS);
}

export function writeOverlaySettings(settings: OverlaySettings): void {
  saveToStorage(STORAGE_KEYS.OVERLAY_SETTINGS, settings);
}

export async function readOverlaySettingsFromServer(): Promise<OverlaySettings | null> {
  try {
    const response = await fetch(OVERLAY_SETTINGS_SERVER_URL, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as OverlaySettings | null;
    if (!data?.scenes || !data.activeSceneId) return null;
    return data;
  } catch {
    return null;
  }
}

/** Inject Last.fm credentials from localStorage into all nowPlaying widgets
 *  so the live/OBS page (which has its own browser context) can read them
 *  from the scene data synced via WebSocket. */
function injectLastFmCredentials(settings: OverlaySettings): OverlaySettings {
  const conn = readLastFmConnection();
  const hasConn = Boolean(conn?.apiKey && conn?.username);
  let anyModified = false;
  const scenes = settings.scenes.map((scene) => {
    let sceneModified = false;
    const widgets = scene.widgets.map((w) => {
      if (w.kind !== "nowPlaying") return w;
      if (hasConn) {
        // Conectado: siempre la conexión global vigente
        if (w.data.lastfmApiKey !== conn!.apiKey || w.data.lastfmUsername !== conn!.username) {
          sceneModified = true;
          anyModified = true;
          return { ...w, data: { ...w.data, lastfmApiKey: conn!.apiKey, lastfmUsername: conn!.username } };
        }
      } else if (w.data.lastfmApiKey || w.data.lastfmUsername) {
        // Desconectado: limpiar credenciales para que OBS deje de mostrar música
        sceneModified = true;
        anyModified = true;
        return { ...w, data: { ...w.data, lastfmApiKey: "", lastfmUsername: "" } };
      }
      return w;
    });
    if (sceneModified) {
      return { ...scene, widgets, updatedAt: new Date().toISOString() };
    }
    return scene;
  });
  if (!anyModified) return settings;
  return { ...settings, scenes };
}

/** Estampa la sesión actual en todas las escenas antes de enviarlas al bridge. */
function injectSessionIntoSettings(settings: OverlaySettings): OverlaySettings {
  return {
    ...settings,
    scenes: settings.scenes.map((scene) => stampSceneWithSession(scene)),
  };
}

export async function persistOverlaySettingsToServer(settings: OverlaySettings): Promise<void> {
  pendingSettings = injectSessionIntoSettings(injectLastFmCredentials(settings));
  if (overlaySettingsSyncTimer !== null) window.clearTimeout(overlaySettingsSyncTimer);
  overlaySettingsSyncTimer = window.setTimeout(async () => {
    overlaySettingsSyncTimer = null;
    const toSend = pendingSettings;
    if (!toSend) return;
    pendingSettings = null;
    try {
      await fetch(OVERLAY_SETTINGS_SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSend),
        cache: "no-store",
      });
      // Los eventos activos de los widgets de alerta pudieron cambiar
      void refreshAlertEngineConfig();
    } catch {
      // Bridge not running
    }
  }, OVERLAY_SETTINGS_SYNC_DELAY_MS);
}

export function createSettingsFromScene(scene: OverlaySceneConfig): OverlaySettings {
  return { activeSceneId: scene.id, scenes: [scene] };
}

export function buildNewScene(name = "New Scene"): OverlaySceneConfig {
  const base = cloneScene(DEFAULT_OVERLAY_SCENE);
  base.id = `scene-${Math.random().toString(36).slice(2, 10)}`;
  base.name = name;
  base.widgets = [];
  base.assets = [];
  base.updatedAt = new Date().toISOString();
  return base;
}

export async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function inferAssetKind(file: File | { type?: string; name: string }): OverlayAssetKind {
  const mimeType = file.type || "";
  const lowerName = file.name.toLowerCase();

  if (mimeType.startsWith("audio/") || /\.(mp3|wav|ogg|aac|m4a)$/i.test(lowerName)) return "audio";
  if (mimeType.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(lowerName)) return "video";
  if (mimeType === "image/gif" || /\.gif$/i.test(lowerName)) return "gif";
  return "image";
}

export function createOverlayAsset(input: {
  name: string;
  kind: OverlayAssetKind;
  src: string;
  thumbnailSrc?: string;
}): OverlayAsset {
  return {
    id: createId("asset"),
    name: input.name,
    kind: input.kind,
    src: input.src,
    thumbnailSrc: input.thumbnailSrc || input.src,
    createdAt: new Date().toISOString(),
  };
}

export function createWidget(kind: OverlayWidgetKind, zIndex: number): OverlayWidget {
  const def = getWidgetDefinition(kind);

  const widget = {
    id: createId("widget"),
    kind,
    name: def.name,
    x: 120,
    y: 120,
    width: def.width,
    height: def.height,
    zIndex,
    locked: false,
    visible: true,
    style: { ...DEFAULT_WIDGET_STYLE, ...def.style },
    sound: {
      assetId: null,
      volume: 80,
      muted: false,
    },
    assets: {
      primaryAssetId: null,
      secondaryAssetId: null,
    },
    // Clonamos para que cada widget tenga su propia copia de la data inicial
    data: JSON.parse(JSON.stringify(def.data)),
  };

  return widget as unknown as OverlayWidget;
}

export function formatSeconds(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function getAssetById(scene: OverlaySceneConfig, assetId: string | null) {
  if (!assetId) return null;
  return scene.assets.find((asset) => asset.id === assetId) || null;
}

export function parseCustomWidgetProps(propsJson: string) {
  try {
    const parsed = JSON.parse(propsJson);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

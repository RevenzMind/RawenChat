import * as path from "path";
import * as http from "http";
import * as fs from "fs";
import { app } from "electron";
import { WebSocket, WebSocketServer } from "ws";
import { getContentType, sanitizeFileName } from "../utils";
import { configureAlertEngine, getAlertEngineDebug, mapEventSubNotification, type AlertEngineConfig, type EngineAlert } from "./alert-engine";

export const BRIDGE_WS_PORT = 3002;
export const BRIDGE_HTTP_PORT = 3003;

const AVATAR_SETTINGS_FILE = "avatar-settings.json";
const OBS_COMPONENT_FILE = "obs-component.json";
const OVERLAY_SCENE_FILE = "overlay-scene.json";
const OVERLAY_SETTINGS_FILE = "overlay-settings.json";
const MAX_OVERLAY_SCENE_BYTES = 25 * 1024 * 1024;

export type AvatarSettings = {
  micId: string;
  threshold: number;
  idleImage: string;
  activeImage: string;
  idleImageName: string;
  activeImageName: string;
};

type OverlayScene = Record<string, unknown> & { id?: string };

export type OverlaySceneRecord = {
  revision: number;
  scene: OverlayScene;
};

let overlaySceneRecord: OverlaySceneRecord | null = null;
let overlayWriteQueue: Promise<void> = Promise.resolve();

const overlayClients = new Set<WebSocket>();
const avatarClients = new Set<WebSocket>();

let cameraOfferer: WebSocket | null = null;
const cameraViewers = new Map<string, WebSocket>();
let cameraViewerSeq = 0;

const getAvatarDataDir = () => path.join(app.getPath("userData"), "avatar");
const getAvatarAssetsDir = () => path.join(getAvatarDataDir(), "assets");
const getOverlayDataDir = () => path.join(app.getPath("userData"), "overlay");
const getOverlayAssetsDir = () => path.join(getOverlayDataDir(), "assets");
export const getAvatarSettingsPath = () => path.join(getAvatarDataDir(), AVATAR_SETTINGS_FILE);
export const getObsComponentPath = () => path.join(app.getPath("userData"), OBS_COMPONENT_FILE);
export const getOverlayScenePath = () => path.join(getOverlayDataDir(), OVERLAY_SCENE_FILE);
export const getOverlaySettingsPath = () => path.join(getOverlayDataDir(), OVERLAY_SETTINGS_FILE);

function ensureDataDirs(): void {
  fs.mkdirSync(getAvatarAssetsDir(), { recursive: true });
  fs.mkdirSync(getOverlayAssetsDir(), { recursive: true });
}

function safeSend(ws: WebSocket, payload: Record<string, unknown>): void {
  try {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  } catch {}
}

function broadcast(clients: Set<WebSocket>, payload: Record<string, unknown>): void {
  const message = JSON.stringify(payload);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
}

export function broadcastAvatarEvent(payload: Record<string, unknown>): void {
  broadcast(avatarClients, payload);
}

function broadcastOverlayScene(payload: Record<string, unknown>): void {
  broadcast(overlayClients, payload);
}

function isOverlayScene(value: unknown): value is OverlayScene {
  return Boolean(value && typeof value === "object" && "widgets" in value && "assets" in value);
}

function handleOverlaySocket(ws: WebSocket): void {
  overlayClients.add(ws);

  void getOverlaySceneRecord().then((record) => {
    if (!record) return;
    safeSend(ws, { type: "OVERLAY_SCENE_UPDATED", revision: record.revision, scene: record.scene });
  });

  ws.on("message", (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString()) as { type?: string; scene?: unknown };
      if (data.type === "UPDATE_OVERLAY_SCENE" && isOverlayScene(data.scene)) {
        void saveOverlayScene(data.scene).catch((error) => {
          console.error("No se pudo actualizar la escena del overlay:", error);
        });
      }
    } catch (err) {
      console.error("Error procesando mensaje del canal /overlay:", err);
    }
  });

  ws.on("close", () => overlayClients.delete(ws));
}

function handleAvatarSocket(ws: WebSocket): void {
  avatarClients.add(ws);

  ws.on("message", (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString()) as { type?: string; value?: unknown };
      if (data.type === "UPDATE_AVATAR_STATE") {
        broadcast(avatarClients, { type: "SET_ACTIVE", value: Boolean(data.value) });
      }
      if (data.type === "UPDATE_THRESHOLD") {
        broadcast(avatarClients, { type: "NEW_THRESHOLD", value: data.value });
      }
    } catch (err) {
      console.error("Error procesando mensaje del canal /avatar:", err);
    }
  });

  ws.on("close", () => avatarClients.delete(ws));
}

function handleCameraPublishSocket(ws: WebSocket): void {
  if (cameraOfferer && cameraOfferer.readyState === WebSocket.OPEN) {
    try { cameraOfferer.close(); } catch {}
  }
  cameraOfferer = ws;

  for (const [waitingId] of cameraViewers) {
    safeSend(ws, { type: "new-viewer", viewerId: waitingId });
  }

  ws.on("message", (raw: Buffer) => {
    try {
      const text = raw.toString();
      const msg = JSON.parse(text) as Record<string, unknown>;
      if (msg.type === "ping") return;
      if (msg.type !== "offer" && msg.type !== "ice") return;

      const viewerId = msg.viewerId as string | undefined;
      if (viewerId) {
        const viewer = cameraViewers.get(viewerId);
        if (viewer?.readyState === WebSocket.OPEN) viewer.send(text);
        return;
      }
      cameraViewers.forEach((viewer) => {
        if (viewer.readyState === WebSocket.OPEN) viewer.send(text);
      });
    } catch {}
  });

  ws.on("close", () => {
    if (cameraOfferer === ws) cameraOfferer = null;
  });
}

function handleCameraViewSocket(ws: WebSocket): void {
  const viewerId = `v${++cameraViewerSeq}`;
  cameraViewers.set(viewerId, ws);

  safeSend(ws, { type: "connected", viewerId });
  if (cameraOfferer?.readyState === WebSocket.OPEN) {
    safeSend(cameraOfferer, { type: "new-viewer", viewerId });
  }

  ws.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (msg.type === "ping") return;
      if (cameraOfferer?.readyState === WebSocket.OPEN) {
        safeSend(cameraOfferer, { ...msg, viewerId });
      }
    } catch {}
  });

  ws.on("close", () => cameraViewers.delete(viewerId));
}

export function startBridgeSocketServer(): void {
  const wss = new WebSocketServer({
    port: BRIDGE_WS_PORT,
    host: "127.0.0.1",
    maxPayload: MAX_OVERLAY_SCENE_BYTES,
  });

  wss.on("connection", (ws, req) => {
    const channel = (req.url ?? "/").split("?")[0];

    switch (channel) {
      case "/overlay":
        handleOverlaySocket(ws);
        break;
      case "/avatar":
        handleAvatarSocket(ws);
        break;
      case "/camera/publish":
        handleCameraPublishSocket(ws);
        break;
      case "/camera/view":
        handleCameraViewSocket(ws);
        break;
      default:
        handleOverlaySocket(ws);
    }
  });

  wss.on("error", (err) => console.error("Error en el servidor de sockets:", err.message));
  console.log(`Puente de sockets en ws://127.0.0.1:${BRIDGE_WS_PORT} (/overlay | /avatar | /camera/*)`);
}

function writeJson(res: http.ServerResponse, data: unknown, statusCode = 200): void {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Private-Network": "true",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;

    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > MAX_OVERLAY_SCENE_BYTES) {
        tooLarge = true;
      }
    });
    req.on("end", () => {
      if (tooLarge) {
        reject(new Error("La escena supera el tamaño máximo permitido."));
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON inválido."));
      }
    });
    req.on("error", reject);
  });
}

function serveAsset(res: http.ServerResponse, assetsDir: string, fileName: string): void {
  const filePath = path.resolve(assetsDir, fileName);
  const rootDir = path.resolve(assetsDir);

  if (!filePath.startsWith(rootDir + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": getContentType(filePath),
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

let pendingTwitchCallback: { accessToken: string; state: string; error?: string } | null = null;
let overlaySession: { channel: string; platform: "twitch" | "kick" } | null = null;

function serveJsonFile(res: http.ServerResponse, filePath: string): void {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return writeJson(res, null);
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

export function startBridgeHttpServer(): void {
  ensureDataDirs();

  const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url || "/", `http://127.0.0.1:${BRIDGE_HTTP_PORT}`);
    const pathname = requestUrl.pathname;

    if (req.method === "OPTIONS") {
      writeJson(res, null, 204);
      return;
    }

    if (pathname === "/overlay-scene" && req.method === "GET") {
      const wantedId = requestUrl.searchParams.get("id");
      if (wantedId) {
        void getOverlaySettings().then((settings) => {
          const s = settings as { scenes?: Array<Record<string, unknown>>; activeSceneId?: string } | null;
          const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
          const found = s?.scenes?.find((sc) => sc.id === wantedId || norm(sc.name) === norm(wantedId));
          if (found) return writeJson(res, { revision: 0, scene: found });
          return getOverlaySceneRecord().then((record) => writeJson(res, record));
        });
        return;
      }
      void getOverlaySceneRecord().then((record) => writeJson(res, record));
      return;
    }

    if (pathname === "/overlay-scene" && req.method === "POST") {
      void readJsonBody(req)
        .then((scene) => {
          if (!isOverlayScene(scene)) throw new Error("La escena no tiene un formato válido.");
          return saveOverlayScene(scene);
        })
        .then((record) => writeJson(res, record))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "No se pudo guardar la escena.";
          writeJson(res, { error: message }, 400);
        });
      return;
    }

    if (pathname === "/overlay-settings" && req.method === "GET") {
      void getOverlaySettings().then((settings) => writeJson(res, settings));
      return;
    }

    if (pathname === "/overlay-settings" && req.method === "POST") {
      void readJsonBody(req)
        .then((settings) => {
          if (!settings || typeof settings !== "object") throw new Error("Settings inválidos.");
          return saveOverlaySettings(settings as Record<string, unknown>);
        })
        .then((saved) => writeJson(res, saved))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "No se pudo guardar los settings.";
          writeJson(res, { error: message }, 400);
        });
      return;
    }

    if (pathname === "/avatar-settings") {
      serveJsonFile(res, getAvatarSettingsPath());
      return;
    }

    if (pathname === "/obs-component") {
      serveJsonFile(res, getObsComponentPath());
      return;
    }

    if (pathname === "/overlay-session") {
      if (req.method === "POST") {
        void readJsonBody(req)
          .then((data) => {
            const d = data as { channel?: string; platform?: string };
            overlaySession = {
              channel: typeof d?.channel === "string" ? d.channel : "",
              platform: d?.platform === "kick" ? "kick" : "twitch",
            };
            broadcastOverlayScene({ type: "OVERLAY_SESSION_UPDATED", session: overlaySession });
            writeJson(res, { ok: true });
          })
          .catch(() => writeJson(res, { ok: false }, 400));
        return;
      }
      writeJson(res, overlaySession);
      return;
    }

    if (pathname === "/overlay-alert" && req.method === "POST") {
      void readJsonBody(req)
        .then((data) => {
          const alert = data as EngineAlert;
          if (!alert || typeof alert !== "object" || !alert.kind) throw new Error("Alerta inválida");
          broadcastOverlayScene({ type: "OVERLAY_ALERT", alert });
          writeJson(res, { ok: true });
        })
        .catch(() => writeJson(res, { ok: false }, 400));
      return;
    }

    if (pathname === "/alert-debug") {
      writeJson(res, getAlertEngineDebug());
      return;
    }

    if (pathname === "/eventsub/webhook" && req.method === "POST") {
      void readJsonBody(req)
        .then((data) => {
          const env = data as {
            challenge?: string;
            metadata?: { message_type?: string; subscription_type?: string };
            subscription?: { type?: string };
            event?: Record<string, unknown>;
            payload?: { subscription?: { type?: string }; event?: Record<string, unknown> };
          };
          if (typeof env?.challenge === "string") {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end(env.challenge);
            return;
          }
          const subType = env?.subscription?.type ?? env?.payload?.subscription?.type ?? env?.metadata?.subscription_type ?? "";
          const event = env?.event ?? env?.payload?.event ?? {};
          const alert = mapEventSubNotification(subType, event);
          if (alert) {
            console.log("[alert-engine] alerta webhook:", alert.kind, alert.user);
            broadcastOverlayScene({ type: "OVERLAY_ALERT", alert });
          }
          writeJson(res, { ok: true });
        })
        .catch(() => writeJson(res, { ok: false }, 400));
      return;
    }

    if (pathname === "/alert-config" && req.method === "POST") {
      void readJsonBody(req)
        .then((data) => {
          const config = data as AlertEngineConfig | null;
          configureAlertEngine(config && config.accessToken ? config : null, (alert) => {
            broadcastOverlayScene({ type: "OVERLAY_ALERT", alert });
          });
          writeJson(res, { ok: true });
        })
        .catch(() => writeJson(res, { ok: false }, 400));
      return;
    }

    if (pathname === "/twitch-callback") {
      if (req.method === "GET" && requestUrl.searchParams.get("poll") === "1") {
        const pending = pendingTwitchCallback;
        pendingTwitchCallback = null;
        writeJson(res, pending);
        return;
      }

      if (req.method === "POST") {
        void readJsonBody(req)
          .then((data) => {
            const d = data as { access_token?: string; state?: string; error?: string };
            if (d && d.state && (d.access_token || d.error)) {
              pendingTwitchCallback = {
                accessToken: d.access_token ?? "",
                state: d.state,
                error: d.error || undefined,
              };
            }
            writeJson(res, { ok: true });
          })
          .catch(() => writeJson(res, { ok: false }, 400));
        return;
      }

      if (req.method === "GET") {
        res.writeHead(200, {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>RawenChat · Twitch</title></head>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#fff;font-family:system-ui,sans-serif">
<div style="text-align:center">
  <div style="width:52px;height:52px;margin:0 auto 14px;border-radius:14px;background:#a970ff;display:flex;align-items:center;justify-content:center;font-size:26px">✓</div>
  <h2 id="msg" style="margin:0 0 6px;font-size:18px">Enviando autorización a RawenChat…</h2>
  <p style="margin:0;color:#a1a1aa;font-size:13px">Ya puedes cerrar esta pestaña.</p>
</div>
<script>
  (function () {
    var h = new URLSearchParams(location.hash.slice(1));
    var q = new URLSearchParams(location.search);
    var payload = {
      access_token: h.get("access_token") || "",
      state: h.get("state") || q.get("state") || "",
      error: q.get("error") || ""
    };
    fetch("/twitch-callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function () {
      document.getElementById("msg").textContent = payload.error
        ? "Autorización cancelada."
        : "Cuenta autorizada";
    }).catch(function () {
      document.getElementById("msg").textContent = "No se pudo avisar a RawenChat. ¿Está abierta la app?";
    });
  })();
</script>
</body></html>`);
        return;
      }
    }

    if (pathname.startsWith("/overlay-assets/")) {
      serveAsset(res, getOverlayAssetsDir(), decodeURIComponent(pathname.replace("/overlay-assets/", "")));
      return;
    }

    if (pathname.startsWith("/avatar-assets/")) {
      serveAsset(res, getAvatarAssetsDir(), decodeURIComponent(pathname.replace("/avatar-assets/", "")));
      return;
    }

    res.writeHead(404, { "Access-Control-Allow-Origin": "*" });
    res.end("Not Found");
  });

  server.on("error", (err) => console.error("Error en el servidor HTTP local:", err));
  server.listen(BRIDGE_HTTP_PORT, "127.0.0.1", () => {
    console.log(`API local en http://127.0.0.1:${BRIDGE_HTTP_PORT}`);
  });
}

export async function getOverlaySceneRecord(): Promise<OverlaySceneRecord | null> {
  if (overlaySceneRecord) return overlaySceneRecord;
  try {
    const data = await fs.promises.readFile(getOverlayScenePath(), "utf8");
    overlaySceneRecord = JSON.parse(data) as OverlaySceneRecord;
    return overlaySceneRecord;
  } catch {
    return null;
  }
}

export function saveOverlayScene(scene: OverlayScene): Promise<OverlaySceneRecord> {
  const operation = overlayWriteQueue.then(async () => {
    ensureDataDirs();
    const currentRecord = await getOverlaySceneRecord();
    const currentUpdatedAt = Date.parse(String(currentRecord?.scene.updatedAt || "")) || 0;
    const incomingUpdatedAt = Date.parse(String(scene.updatedAt || "")) || 0;
    if (currentRecord && incomingUpdatedAt > 0 && incomingUpdatedAt <= currentUpdatedAt) {
      return currentRecord;
    }

    const nextRecord: OverlaySceneRecord = {
      revision: (currentRecord?.revision || 0) + 1,
      scene,
    };

    await fs.promises.writeFile(getOverlayScenePath(), JSON.stringify(nextRecord), "utf8");
    overlaySceneRecord = nextRecord;
    broadcastOverlayScene({
      type: "OVERLAY_SCENE_UPDATED",
      revision: nextRecord.revision,
      scene: nextRecord.scene,
    });
    return nextRecord;
  });

  overlayWriteQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

export async function saveOverlayAsset(
  fileName: string,
  dataUrl: string,
): Promise<{ url: string; fileName: string }> {
  ensureDataDirs();
  const match = /^data:[^;]+;base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("Formato de asset inválido.");

  const safeFileName = sanitizeFileName(fileName);
  const filePath = path.join(getOverlayAssetsDir(), safeFileName);
  await fs.promises.writeFile(filePath, Buffer.from(match[1], "base64"));

  return {
    fileName,
    url: `http://127.0.0.1:${BRIDGE_HTTP_PORT}/overlay-assets/${encodeURIComponent(safeFileName)}`,
  };
}

export async function saveAvatarImage(fileName: string, dataUrl: string): Promise<{ url: string; fileName: string }> {
  ensureDataDirs();
  const match = /^data:[^;]+;base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("Formato de imagen inválido.");

  const safeFileName = sanitizeFileName(fileName);
  const filePath = path.join(getAvatarAssetsDir(), safeFileName);
  await fs.promises.writeFile(filePath, Buffer.from(match[1], "base64"));

  return {
    fileName,
    url: `http://127.0.0.1:${BRIDGE_HTTP_PORT}/avatar-assets/${encodeURIComponent(safeFileName)}`,
  };
}

export async function saveAvatarSettings(settings: AvatarSettings): Promise<void> {
  ensureDataDirs();
  await fs.promises.writeFile(getAvatarSettingsPath(), JSON.stringify(settings, null, 2), "utf8");
  broadcastAvatarEvent({ type: "AVATAR_SETTINGS_UPDATED" });
}

export async function getAvatarSettings(): Promise<AvatarSettings | null> {
  try {
    const data = await fs.promises.readFile(getAvatarSettingsPath(), "utf8");
    return JSON.parse(data) as AvatarSettings;
  } catch {
    return null;
  }
}

export async function saveObsComponent(componentCode: string): Promise<void> {
  await fs.promises.writeFile(getObsComponentPath(), JSON.stringify({ componentCode }, null, 2), "utf8");
}

export async function getObsComponent(): Promise<string | null> {
  try {
    const data = await fs.promises.readFile(getObsComponentPath(), "utf8");
    return (JSON.parse(data) as { componentCode: string }).componentCode;
  } catch {
    return null;
  }
}

export async function getOverlaySettings(): Promise<Record<string, unknown> | null> {
  try {
    const data = await fs.promises.readFile(getOverlaySettingsPath(), "utf8");
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function saveOverlaySettings(settings: Record<string, unknown>): Promise<Record<string, unknown>> {
  ensureDataDirs();
  await fs.promises.writeFile(getOverlaySettingsPath(), JSON.stringify(settings, null, 2), "utf8");
  return settings;
}

import { WebSocket } from "ws";

export type AlertKind = "follow" | "subscribe" | "gift" | "raid" | "cheer";

export interface AlertEngineConfig {
  clientId: string;
  accessToken: string;
  userId: string;
  events: AlertKind[];
}

export interface EngineAlert {
  kind: AlertKind;
  platform: "twitch";
  user: string;
  count: number;
}

const EVENTSUB_WS_URL =
  process.env.RAWENCHAT_EVENTSUB_WS || "wss://eventsub.wss.twitch.tv/ws";
const HELIX_BASE = "https://api.twitch.tv/helix";

const SUBSCRIPTION_DEFS: Record<AlertKind, { type: string; version: string }> = {
  follow: { type: "channel.follow", version: "2" },
  subscribe: { type: "channel.subscribe", version: "1" },
  gift: { type: "channel.subscription.gift", version: "1" },
  raid: { type: "channel.raid", version: "1" },
  cheer: { type: "channel.cheer", version: "1" },
};

interface EngineState {
  config: AlertEngineConfig | null;
  socket: WebSocket | null;
  sessionId: string | null;
  disposed: boolean;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  creatingSubs: boolean;
}

const state: EngineState = {
  config: null,
  socket: null,
  sessionId: null,
  disposed: true,
  reconnectTimer: null,
  creatingSubs: false,
};

let onAlertCallback: ((alert: EngineAlert) => void) | null = null;

const debugInfo = {
  startedAt: null as string | null,
  lastMessageAt: null as string | null,
  lastMessageType: null as string | null,
  lastError: null as string | null,
  recentAlerts: [] as Array<{ at: string; kind: string; user: string }>,
};

export interface AlertEngineDebug {
  running: boolean;
  socketOpen: boolean;
  sessionId: string | null;
  events: string[];
  startedAt: string | null;
  lastMessageAt: string | null;
  lastMessageType: string | null;
  lastError: string | null;
  recentAlerts: Array<{ at: string; kind: string; user: string }>;
}

export function getAlertEngineDebug(): AlertEngineDebug {
  return {
    running: !state.disposed && Boolean(state.config),
    socketOpen: state.socket?.readyState === WebSocket.OPEN,
    sessionId: state.sessionId,
    events: state.config?.events ?? [],
    startedAt: debugInfo.startedAt,
    lastMessageAt: debugInfo.lastMessageAt,
    lastMessageType: debugInfo.lastMessageType,
    lastError: debugInfo.lastError,
    recentAlerts: [...debugInfo.recentAlerts].slice(-10),
  };
}

function log(...args: unknown[]): void {
  console.log("[alert-engine]", ...args);
}

function teardownSocket(): void {
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  if (state.socket) {
    const s = state.socket;
    state.socket = null;
    try { s.close(); } catch {}
  }
  state.sessionId = null;
}

export function configureAlertEngine(
  config: AlertEngineConfig | null,
  onAlert: (alert: EngineAlert) => void,
): void {
  onAlertCallback = onAlert;

  const enabled = config?.events?.length ? config : null;
  if (configKey(enabled) === configKey(state.config) && !state.disposed) {
    return;
  }

  teardownSocket();
  state.config = enabled;
  state.disposed = !enabled;
  if (!enabled) {
    log("motor detenido");
    return;
  }
  log("motor iniciado para", enabled.userId || "(resolver user)", "· eventos:", enabled.events.join(","));
  if (process.env.RAWENCHAT_EVENTSUB_WS) log("MODO MOCK: conectado a", EVENTSUB_WS_URL);
  debugInfo.startedAt = new Date().toISOString();
  connect();
}

function configKey(config: AlertEngineConfig | null): string {
  if (!config) return "";
  return [
    config.clientId,
    config.accessToken,
    config.userId,
    [...config.events].sort().join(","),
  ].join("|");
}

function connect(): void {
  if (state.disposed || !state.config) return;
  openSocket(EVENTSUB_WS_URL);
}

function openSocket(url: string): void {
  let socket: WebSocket;
  try {
    socket = new WebSocket(url);
  } catch (err) {
    log("no se pudo abrir el socket:", err);
    scheduleReconnect();
    return;
  }
  state.socket = socket;

  socket.on("message", (raw) => handleMessage(raw));
  socket.on("close", () => {
    if (state.socket === socket) state.socket = null;
    state.sessionId = null;
    scheduleReconnect();
  });
  socket.on("error", (err) => {
    log("error de socket:", String(err.message || err));
    try { socket.close(); } catch {}
  });
}

function handleMessage(raw: unknown): void {
  try {
    const msg = JSON.parse(String(raw)) as {
      metadata?: { message_type?: string };
      payload?: {
        session?: { id?: string; reconnect_url?: string };
        subscription?: { type?: string };
        event?: Record<string, unknown>;
      };
    };
    const messageType = msg.metadata?.message_type;
    debugInfo.lastMessageAt = new Date().toISOString();
    debugInfo.lastMessageType = messageType ?? "(sin tipo)";
    if (messageType === "session_welcome") {
      state.sessionId = msg.payload?.session?.id ?? null;
      void createSubscriptions();
    } else if (messageType === "session_reconnect") {
      const url = msg.payload?.session?.reconnect_url;
      if (url) {
        const old = state.socket;
        state.socket = null;
        state.sessionId = null;
        openSocket(url);
        try { old?.close(); } catch {}
      }
    } else if (messageType === "notification") {
      const alert = mapNotification(
        msg.payload?.subscription?.type ?? "",
        msg.payload?.event ?? {},
      );
      if (alert) {
        log("alerta:", alert.kind, alert.user);
        debugInfo.recentAlerts.push({ at: new Date().toISOString(), kind: alert.kind, user: alert.user });
        if (debugInfo.recentAlerts.length > 20) debugInfo.recentAlerts.shift();
        onAlertCallback?.(alert);
      }
    } else if (messageType === "revocation") {
      log("suscripción revocada:", msg.payload?.subscription?.type);
    }
  } catch (err) {
    debugInfo.lastError = String(err);
    log("mensaje inválido:", err);
  }
}

function scheduleReconnect(): void {
  if (state.disposed || !state.config || state.reconnectTimer) return;
  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    connect();
  }, 4000);
}

async function helixPost(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number }> {
  const config = state.config;
  if (!config) return { ok: false, status: 0 };
  try {
    const res = await fetch(`${HELIX_BASE}${path}`, {
      method: "POST",
      headers: {
        "Client-Id": config.clientId,
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      log(`helix ${path} → ${res.status}`, await res.text().catch(() => ""));
      return { ok: false, status: res.status };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    log(`helix ${path} falló:`, err);
    return { ok: false, status: 0 };
  }
}

async function deleteAllSubscriptions(): Promise<void> {
  const config = state.config;
  if (!config) return;
  const headers = {
    "Client-Id": config.clientId,
    Authorization: `Bearer ${config.accessToken}`,
  };
  let cursor = "";
  for (let page = 0; page < 5; page++) {
    let subs: Array<{ id?: string }> = [];
    let nextCursor = "";
    try {
      const query = cursor ? `?after=${encodeURIComponent(cursor)}` : "";
      const res = await fetch(`${HELIX_BASE}/eventsub/subscriptions${query}`, { headers });
      if (!res.ok) {
        log("no pude listar suscripciones:", res.status, await res.text().catch(() => ""));
        return;
      }
      const data = (await res.json()) as {
        data?: Array<{ id?: string }>;
        pagination?: { cursor?: string };
      };
      subs = data.data ?? [];
      nextCursor = data.pagination?.cursor ?? "";
    } catch (err) {
      log("no pude listar suscripciones:", err);
      return;
    }
    for (const sub of subs) {
      if (!sub.id) continue;
      try {
        await fetch(`${HELIX_BASE}/eventsub/subscriptions?id=${encodeURIComponent(sub.id)}`, {
          method: "DELETE",
          headers,
        });
      } catch {}
    }
    if (!nextCursor || !subs.length) break;
    cursor = nextCursor;
  }
}

async function resolveUserId(): Promise<string> {
  const config = state.config;
  if (!config) return "";
  if (config.userId) return config.userId;
  try {
    const res = await fetch(`${HELIX_BASE}/users`, {
      headers: {
        "Client-Id": config.clientId,
        Authorization: `Bearer ${config.accessToken}`,
      },
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { data?: Array<{ id?: string }> };
    const id = data.data?.[0]?.id ?? "";
    if (id) config.userId = id;
    return id;
  } catch {
    return "";
  }
}

async function createSubscriptions(): Promise<void> {
  const config = state.config;
  if (!config || !state.sessionId || state.creatingSubs) return;
  state.creatingSubs = true;
  try {
    const userId = await resolveUserId();
    if (!userId) {
      log("sin user id: no se pueden crear suscripciones");
      return;
    }

    await deleteAllSubscriptions();
    if (!state.sessionId || state.disposed) return;

    for (const kind of config.events) {
      const def = SUBSCRIPTION_DEFS[kind];
      if (!def) continue;
      let condition: Record<string, string>;
      if (def.type === "channel.raid") {
        condition = { to_broadcaster_user_id: userId };
      } else {
        condition = { broadcaster_user_id: userId };
        if (def.type === "channel.follow") condition.moderator_user_id = userId;
      }

      const res = await helixPost("/eventsub/subscriptions", {
        type: def.type,
        version: def.version,
        condition,
        transport: { method: "websocket", session_id: state.sessionId },
      });
      if (res.ok) {
        log(`suscripción ${def.type}: ok`);
      } else if (res.status === 403) {
        log(`suscripción ${def.type}: falta scope — vuelve a autorizar la app en Ajustes`);
      } else {
        log(`suscripción ${def.type}: rechazada`);
      }
    }
  } finally {
    state.creatingSubs = false;
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

export function mapEventSubNotification(subType: string, event: Record<string, unknown>): EngineAlert | null {
  return mapNotification(subType, event);
}

function mapNotification(subType: string, event: Record<string, unknown>): EngineAlert | null {
  switch (subType) {
    case "channel.follow":
      return { kind: "follow", platform: "twitch", user: str(event.user_name), count: 1 };
    case "channel.subscribe":
      return { kind: "subscribe", platform: "twitch", user: str(event.user_name), count: 1 };
    case "channel.subscription.gift":
      return { kind: "gift", platform: "twitch", user: str(event.user_name), count: num(event.total) };
    case "channel.raid":
      return {
        kind: "raid",
        platform: "twitch",
        user: str(event.from_broadcaster_user_name),
        count: num(event.viewers),
      };
    case "channel.cheer":
      return {
        kind: "cheer",
        platform: "twitch",
        user: event.is_anonymous ? "Anónimo" : str(event.user_name),
        count: num(event.bits),
      };
    default:
      return null;
  }
}

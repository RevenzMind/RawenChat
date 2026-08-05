import { STORAGE_KEYS } from "@/constants/config";
import { getFromStorage, saveToStorage, removeFromStorage } from "@/utils/storage";


/**
 * Integración con la API oficial de Twitch (EventSub/Helix).
 *
 * Modelo "app única del creador": se registra UNA app en dev.twitch.tv y el
 * Client ID (que es público) va embebido aquí. Los usuarios solo autorizan su
 * canal vía Device Flow (twitch.tv/activate) — no necesitan crear nada.
 * El Client Secret NUNCA se incluye en una app de escritorio.
 */

/** Client ID de la app oficial de RawenChat (dev.twitch.tv/console/apps). */
export const TWITCH_CLIENT_ID = "p9kbi6l0gjohowa5fryb944x6jm1uq";

export const TWITCH_DEV_CONSOLE_URL = "https://dev.twitch.tv/console/apps";
export const TWITCH_EVENTSUB_SCOPES =
  "moderator:read:followers channel:read:subscriptions bits:read";

/** Callback local que recoge el código de autorización (servidor bridge).
 *  Twitch acepta http solo con el hostname "localhost" (no con IPs). */
export const TWITCH_REDIRECT_URI = "http://localhost:3003/twitch-callback";

/** Sesión de Twitch guardada tras autorizar */
export interface TwitchAuth {
  clientId: string;
  accessToken: string;
  refreshToken: string;
  /** epoch ms en que expira el token (0 = desconocido) */
  expiresAt: number;
  userId: string;
  login: string;
  displayName: string;
  /** "authorize" = flujo OAuth oficial · "manual" = token pegado a mano */
  via: "authorize" | "manual";
}

/** Evento de window para avisar que la sesión de Twitch cambió (conectar/desconectar). */
export const TWITCH_AUTH_CHANGED_EVENT = "rawenchat-twitch-auth";

function notifyTwitchAuthChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TWITCH_AUTH_CHANGED_EVENT));
  }
}

export function readTwitchAuth(): TwitchAuth | null {
  return getFromStorage<TwitchAuth>(STORAGE_KEYS.TWITCH_API);
}

export function saveTwitchAuth(auth: TwitchAuth): void {
  saveToStorage(STORAGE_KEYS.TWITCH_API, auth);
  notifyTwitchAuthChanged();
}

export function clearTwitchAuth(): void {
  removeFromStorage(STORAGE_KEYS.TWITCH_API);
  notifyTwitchAuthChanged();
}

/** Normaliza tokens pegados con el prefijo "oauth:" */
export function normalizeTwitchToken(token: string): string {
  return token.trim().replace(/^oauth:/i, "");
}

/* ------------------------------------------------------------------ */
/* Implicit flow — pantalla oficial de "Autorizar app" sin Client      */
/* Secret. El token vuelve en el fragment de la URL y la página de     */
/* callback del bridge lo recoge y se lo entrega a la app.             */
/* ------------------------------------------------------------------ */

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomTwitchState(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));
}

/** URL de la pantalla oficial de autorización de Twitch. */
export function buildTwitchAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    response_type: "token",
    redirect_uri: TWITCH_REDIRECT_URI,
    scope: TWITCH_EVENTSUB_SCOPES,
    state,
  });
  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

export interface TwitchCallbackPayload {
  accessToken?: string;
  state?: string;
  error?: string;
}

/** Pregunta al bridge si la pestaña de callback ya entregó el token. */
export async function pollTwitchCallbackBridge(): Promise<TwitchCallbackPayload | null> {
  try {
    const res = await fetch(`${TWITCH_REDIRECT_URI}?poll=1`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as TwitchCallbackPayload | null;
    if (!data || (!data.accessToken && !data.error)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Datos del token según Twitch (login, user id, expiración). */
export async function validateTwitchToken(
  accessToken: string,
): Promise<{ login: string; userId: string; expiresIn: number } | null> {
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { login?: string; user_id?: string; expires_in?: number };
    if (!d.login) return null;
    return { login: d.login, userId: d.user_id ?? "", expiresIn: d.expires_in ?? 0 };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Helix — validar tokens y obtener datos del usuario autorizado.      */
/* ------------------------------------------------------------------ */

export interface TwitchUser {
  id: string;
  login: string;
  displayName: string;
}

export async function fetchTwitchUser(
  clientId: string,
  accessToken: string,
): Promise<TwitchUser | null> {
  try {
    const res = await fetch("https://api.twitch.tv/helix/users", {
      headers: { "Client-ID": clientId, Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { id?: string; login?: string; display_name?: string }[];
    };
    const u = data.data?.[0];
    if (!u?.id || !u.login) return null;
    return { id: u.id, login: u.login, displayName: u.display_name || u.login };
  } catch {
    return null;
  }
}

/**
 * Verifica clientId + token contra GET /helix/users (modo manual avanzado).
 * "invalid" = Twitch las rechaza · "network" = no se pudo comprobar.
 */
export async function verifyTwitchCredentials(
  clientId: string,
  oauthToken: string,
): Promise<{ ok: true; login: string } | { ok: false; reason: "invalid" | "network" }> {
  const user = await fetchTwitchUser(clientId, oauthToken);
  if (user) return { ok: true, login: user.login };
  // Distinguir rechazo real de fallo de red con una llamada ligera
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/validate");
    if (!res.ok && res.status !== 401) return { ok: false, reason: "network" };
  } catch {
    return { ok: false, reason: "network" };
  }
  return { ok: false, reason: "invalid" };
}

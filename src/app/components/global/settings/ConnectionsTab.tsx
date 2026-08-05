"use client";

import { useEffect, useRef, useState } from "react";
import {
  readLastFmConnection,
  saveLastFmConnection,
  clearLastFmConnection,
  type LastFmConnection,
} from "@/utils/lastfm";
import {
  readTwitchAuth,
  saveTwitchAuth,
  clearTwitchAuth,
  randomTwitchState,
  buildTwitchAuthorizeUrl,
  pollTwitchCallbackBridge,
  validateTwitchToken,
  fetchTwitchUser,
  TWITCH_CLIENT_ID,
  TWITCH_DEV_CONSOLE_URL,
  TWITCH_REDIRECT_URI,
  type TwitchAuth,
} from "@/utils/twitch";
import { Field, SectionTitle } from "./DevicesTab";

function TwitchIntegrationCard() {
  const [auth, setAuth] = useState<TwitchAuth | null>(null);
  const [phase, setPhase] = useState<"idle" | "requesting" | "waiting" | "error">("idle");
  const [authorizeUrl, setAuthorizeUrl] = useState("");
  const [error, setError] = useState("");
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<string>("");

  useEffect(() => {
    setAuth(readTwitchAuth());
    return () => stopPolling();
  }, []);

  const hasClientId = TWITCH_CLIENT_ID.trim().length > 0;

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  function openLink(url: string) {
    if (window.electron) void window.electron.openExternal(url);
    else window.open(url, "_blank");
  }

  async function connect() {
    setError("");
    setPhase("requesting");
    const state = randomTwitchState();
    stateRef.current = state;
    const url = buildTwitchAuthorizeUrl(state);
    setAuthorizeUrl(url);
    openLink(url);
    setPhase("waiting");

    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      const cb = await pollTwitchCallbackBridge();
      if (!cb || cb.state !== stateRef.current) return;
      stopPolling();
      if (cb.error || !cb.accessToken) {
        setPhase("error");
        setError("La autorización fue cancelada o falló en Twitch.");
        return;
      }
      const [user, info] = await Promise.all([
        fetchTwitchUser(TWITCH_CLIENT_ID, cb.accessToken),
        validateTwitchToken(cb.accessToken),
      ]);
      const next: TwitchAuth = {
        clientId: TWITCH_CLIENT_ID,
        accessToken: cb.accessToken,
        refreshToken: "",
        expiresAt: info?.expiresIn ? Date.now() + info.expiresIn * 1000 : 0,
        userId: info?.userId ?? user?.id ?? "",
        login: info?.login ?? user?.login ?? "",
        displayName: user?.displayName ?? info?.login ?? "",
        via: "authorize",
      };
      saveTwitchAuth(next);
      setAuth(next);
      setPhase("idle");
      setAuthorizeUrl("");
    }, 1500);
  }

  function cancelConnect() {
    stopPolling();
    setPhase("idle");
    setAuthorizeUrl("");
    setError("");
  }

  function disconnect() {
    stopPolling();
    clearTwitchAuth();
    setAuth(null);
    setPhase("idle");
    setAuthorizeUrl("");
    setError("");
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: "#a970ff" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M4.3 3 3 6.4v13.9h4.7V22h2.7l1.9-1.9h3.6l5-5V3H4.3zm14.6 12.2-2.9 2.9h-4.4L9.8 20v-2H5.9V4.9h13v10.3zM16.4 8h-1.9v5.6h1.9V8zm-5.1 0H9.4v5.6h1.9V8z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">Twitch · Alertas y eventos</div>
          <div className="text-[11px] text-[var(--text-muted)]">EventSub oficial: follows, subs y raids en tiempo real</div>
        </div>
        {auth && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-300">Conectado</span>
          </div>
        )}
      </div>

      {auth && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-400/10 border border-emerald-400/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] text-emerald-300">
              Autorizado como <strong>{auth.displayName || auth.login || "canal de Twitch"}</strong>
              {auth.login ? <> · @{auth.login}</> : null}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Las alertas de follows, subs y raids de tu canal usarán la conexión oficial de Twitch.
          </p>
          <button type="button" onClick={disconnect}
            className="w-full py-2 text-xs rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors">
            Desconectar Twitch
          </button>
        </div>
      )}

      {!auth && !hasClientId && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-amber-400/10 border border-amber-400/20">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-[11px] leading-relaxed text-amber-200/90">
            Falta el Client ID del creador: registra una app en{" "}
            <button type="button" className="text-[var(--accent)] hover:underline" onClick={() => openLink(TWITCH_DEV_CONSOLE_URL)}>
              dev.twitch.tv/console →
            </button>{" "}
            y pégalo en <code className="text-[var(--accent)]">TWITCH_CLIENT_ID</code>.
          </p>
        </div>
      )}

      {!auth && phase === "waiting" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            Esperando autorización en el navegador…
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => authorizeUrl && openLink(authorizeUrl)}
              className="flex-1 py-2 text-xs rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors">
              Reabrir pestaña
            </button>
            <button type="button" onClick={cancelConnect}
              className="flex-1 py-2 text-xs rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!auth && phase !== "waiting" && (
        <div className="space-y-3">
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Conecta tu canal con un clic: se abrirá Twitch para autorizar RawenChat.
          </p>
          {error && <div className="text-[11px] text-red-400">{error}</div>}
          <button type="button" onClick={() => void connect()} disabled={!hasClientId || phase === "requesting"}
            className="w-full py-2 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
            style={{ background: phase === "requesting" || !hasClientId ? "var(--elevated)" : "var(--accent)", color: phase === "requesting" || !hasClientId ? "var(--text-muted)" : "#000", border: "1px solid var(--accent-border)" }}>
            {phase === "requesting" ? "Contactando con Twitch…" : "Conectar con Twitch"}
          </button>
        </div>
      )}
    </div>
  );
}

function KickNoticeCard() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: "#53fc18" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a2b02">
            <path d="M5 3h4v7l5-7h5l-5.5 8L19 21h-5l-5-7v7H5V3z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Kick</div>
          <div className="text-[11px] text-[var(--text-muted)]">Alertas y notificaciones no soportadas</div>
        </div>
      </div>
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-amber-400/10 border border-amber-400/20">
        <p className="text-[11px] leading-relaxed text-amber-200/90">
          Kick no ofrece una API pública oficial de eventos, por lo que las alertas automáticas no están disponibles. El chat sí funciona.
        </p>
      </div>
    </div>
  );
}

function LastFmCard() {
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [connection, setConnection] = useState<LastFmConnection | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const conn = readLastFmConnection();
    setConnection(conn);
    if (conn) {
      setApiKey(conn.apiKey);
      setUsername(conn.username);
    }
  }, []);

  async function handleSave() {
    const key = apiKey.trim();
    const user = username.trim();
    if (!key || !user) {
      setError("Completa ambos campos.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(user)}&api_key=${encodeURIComponent(key)}&format=json&limit=1`
      );
      if (!res.ok) {
        setError("API key o usuario inválido.");
        setSaving(false);
        return;
      }
    } catch {
      setError("Error de red.");
      setSaving(false);
      return;
    }
    const conn: LastFmConnection = { apiKey: key, username: user };
    saveLastFmConnection(conn);
    setConnection(conn);
    setSuccess("Conectado a Last.fm");
    setSaving(false);
  }

  function handleDisconnect() {
    clearLastFmConnection();
    setConnection(null);
    setApiKey("");
    setUsername("");
    setSuccess("");
  }

  const isConnected = !!connection?.apiKey;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: "#D51007" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M10.584 17.21l-.96-2.4c-1.113.534-2.073.8-2.88.8-.96 0-1.697-.293-2.213-.88-.516-.586-.774-1.38-.774-2.38 0-1.147.34-2.077 1.02-2.79.68-.714 1.574-1.07 2.68-1.07.6 0 1.24.12 1.92.36l.36-2.52c-.84-.2-1.62-.3-2.34-.3-1.76 0-3.2.56-4.32 1.68C1.957 8.75 1.397 10.19 1.397 11.94c0 1.64.48 2.92 1.44 3.84.96.92 2.24 1.38 3.84 1.38 1.28 0 2.56-.32 3.9-.96zm5.16-10.96c0 .56.16 1.04.48 1.44.32.4.76.6 1.32.6.44 0 .88-.12 1.32-.36l.72 1.92c-.6.36-1.32.54-2.16.54-1.16 0-2.08-.38-2.76-1.14-.68-.76-1.02-1.78-1.02-3.06 0-1.2.34-2.18 1.02-2.94.68-.76 1.6-1.14 2.76-1.14.84 0 1.56.18 2.16.54l-.72 1.92c-.44-.24-.88-.36-1.32-.36-.56 0-1 .2-1.32.6-.32.4-.48.88-.48 1.44z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Last.fm</div>
          <div className="text-[11px] text-[var(--text-muted)]">Widget Now Playing</div>
        </div>
      </div>

      {isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-400/10 border border-emerald-400/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] text-emerald-300">Conectado como <strong>{connection?.username}</strong></span>
          </div>
          {success && <div className="text-[11px] text-emerald-400">{success}</div>}
          <button type="button" onClick={handleDisconnect}
            className="w-full py-2 text-xs rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors">
            Desconectar Last.fm
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="API Key">
            <input className="w-full px-3 py-1.5 text-xs font-mono rounded-md border border-[var(--border)] bg-[var(--card)] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              value={apiKey} placeholder="tu api key de last.fm"
              onChange={(e) => { setError(""); setApiKey(e.target.value); }} />
          </Field>
          <Field label="Usuario Last.fm">
            <input className="w-full px-3 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--card)] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              value={username} placeholder="tu nombre de usuario"
              onChange={(e) => { setError(""); setUsername(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSave(); }} />
          </Field>
          {error && <div className="text-[11px] text-red-400">{error}</div>}
          <button type="button" onClick={() => void handleSave()} disabled={saving}
            className="w-full py-2 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
            style={{ background: saving ? "var(--elevated)" : "var(--accent)", color: saving ? "var(--text-muted)" : "#000", border: "1px solid var(--accent-border)" }}>
            Conectar Last.fm
          </button>
        </div>
      )}
    </div>
  );
}

export function ConnectionsTab() {
  return (
    <div className="space-y-6">
      <SectionTitle>Conexiones</SectionTitle>
      <TwitchIntegrationCard />
      <KickNoticeCard />
      <LastFmCard />
    </div>
  );
}

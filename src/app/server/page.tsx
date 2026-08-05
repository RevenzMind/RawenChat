"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ControlBox from "../components/controlbox";
import Dropdown from "../components/global/Dropdown";
import {
  readAvatarSettings,
  saveAvatarSettings,
  AVATAR_SETTINGS_URL,
} from "@/utils/avatar";
import type { AvatarSettings } from "@/constants/avatar";
import { DEFAULT_COMPONENT_CODE } from "@/hooks";
import { getFromStorage, saveToStorage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";
import { Field } from "@/app/components/ui";


interface BridgeStatus {
  online: boolean;
  latencyMs?: number;
}


async function pingBridge(): Promise<BridgeStatus> {
  const t0 = Date.now();
  try {
    const res = await fetch("http://127.0.0.1:3003/overlay-scene", {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    return { online: res.ok || res.status === 200, latencyMs: Date.now() - t0 };
  } catch {
    return { online: false };
  }
}

async function loadObsComponent(): Promise<string> {
  if (typeof window !== "undefined" && window.electron) {
    const saved = await window.electron.getObsComponent();
    return saved || DEFAULT_COMPONENT_CODE;
  }
  return getFromStorage<string>(STORAGE_KEYS.OBS_CSS) || DEFAULT_COMPONENT_CODE;
}

async function saveObsComponent(code: string): Promise<void> {
  if (typeof window !== "undefined" && window.electron) {
    await window.electron.saveObsComponent(code);
  } else {
    saveToStorage(STORAGE_KEYS.OBS_CSS, code);
  }
}


function SectionHeader({
  color,
  label,
  description,
}: {
  color: string;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-1 h-8 rounded-full shrink-0"
        style={{ background: color }}
      />
      <div>
        <div className="text-sm font-semibold" style={{ color }}>
          {label}
        </div>
        {description && (
          <div className="text-[11px] text-[var(--text-muted)]">{description}</div>
        )}
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4 ${className}`}
    >
      {children}
    </div>
  );
}

function StatusBadge({ online, latencyMs }: { online: boolean; latencyMs?: number }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
        online
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          : "border-red-400/20 bg-red-400/10 text-red-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online ? "bg-emerald-400 animate-pulse" : "bg-red-400"
        }`}
      />
      {online ? `Online${latencyMs !== undefined ? ` · ${latencyMs}ms` : ""}` : "Offline"}
    </div>
  );
}


export default function ServerSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState("");
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>({ online: false });

  const [avatarSettings, setAvatarSettings] = useState<AvatarSettings>(() =>
    typeof window !== "undefined" ? readAvatarSettings() : {
      micId: "",
      threshold: 50,
      idleImage: "",
      activeImage: "",
      idleImageName: "",
      activeImageName: "",
    }
  );
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);

  const [obsCode, setObsCode] = useState("");
  const [obsCodeDraft, setObsCodeDraft] = useState("");
  const [obsCodeDirty, setObsCodeDirty] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) =>
        setMics(devices.filter((d) => d.kind === "audioinput"))
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadObsComponent().then((code) => {
      setObsCode(code);
      setObsCodeDraft(code);
    });
  }, []);

  const checkBridge = useCallback(async () => {
    const status = await pingBridge();
    setBridgeStatus(status);
  }, []);

  useEffect(() => {
    void checkBridge();
    const t = setInterval(() => void checkBridge(), 5000);
    return () => clearInterval(t);
  }, [checkBridge]);


  function updateAvatar(updates: Partial<AvatarSettings>) {
    const next = { ...avatarSettings, ...updates };
    setAvatarSettings(next);
    saveAvatarSettings(next);
  }

  async function handleAvatarImageFile(
    kind: "idle" | "active",
    file: File | null
  ) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      let src = dataUrl;
      try {
        const saved = await window.electron?.saveAvatarImage(file.name, dataUrl);
        if (saved?.url) src = saved.url;
      } catch {}
      if (kind === "idle") {
        updateAvatar({ idleImage: src, idleImageName: file.name });
      } else {
        updateAvatar({ activeImage: src, activeImageName: file.name });
      }
      showToast(`Imagen ${kind === "idle" ? "idle" : "activa"} actualizada`);
    };
    reader.readAsDataURL(file);
  }

  async function pushAvatarToServer() {
    try {
      await fetch(AVATAR_SETTINGS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(avatarSettings),
      });
      showToast("Ajustes de avatar enviados al servidor");
    } catch {
      showToast("Error al conectar con el servidor bridge");
    }
  }

  async function handleSaveObs() {
    await saveObsComponent(obsCodeDraft);
    setObsCode(obsCodeDraft);
    setObsCodeDirty(false);
    try {
      await fetch("http://127.0.0.1:3003/obs-component", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ componentCode: obsCodeDraft }),
      });
    } catch {}
    showToast("Componente OBS guardado");
  }

  async function handleResetObs() {
    setObsCodeDraft(DEFAULT_COMPONENT_CODE);
    setObsCodeDirty(true);
  }

  const obsUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/obs?channel=CANAL&platform=twitch`
      : "http://localhost:3000/obs?channel=CANAL&platform=twitch";


  return (
    <main
      className="h-screen bg-[var(--background)] text-white overflow-hidden flex flex-col"
    >
      {/* Topbar */}
      <header
        className="h-12 shrink-0 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-4"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else window.location.assign("/");
            }}
            className="amoled-button-ghost !px-3 !py-1.5 text-xs"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            Volver
          </button>
          <div>
            <div className="text-sm font-semibold">Configuración del servidor</div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Bridge · Avatar · OBS
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-3"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <StatusBadge online={bridgeStatus.online} latencyMs={bridgeStatus.latencyMs} />
          <ControlBox />
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto rawen-scrollbar">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

          <section>
            <SectionHeader
              color="#ff9a5c"
              label="Servidor bridge"
              description="Conexión entre el editor, OBS y el overlay en vivo"
            />
            <Card>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Estado de conexión</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    HTTP: :3003 · WS: :3002 (/overlay · /avatar · /camera/*)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    online={bridgeStatus.online}
                    latencyMs={bridgeStatus.latencyMs}
                  />
                  <button
                    onClick={() => void checkBridge()}
                    className="amoled-button-ghost !px-3 !py-1.5 text-xs"
                  >
                    Reconectar
                  </button>
                </div>
              </div>
              <div className="border-t border-[var(--border)] pt-4 space-y-1">
                <div className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider mb-2">
                  Endpoints disponibles
                </div>
                {[
                  ["GET/POST", "/overlay-scene", "Escena activa del overlay"],
                  ["GET/POST", "/overlay-settings", "Configuración de escenas"],
                  ["GET/POST", "/avatar-settings", "Ajustes del avatar"],
                  ["GET/POST", "/obs-component", "Componente de chat para OBS"],
                  ["WS", "/camera/*", "Señalización WebRTC de cámara"],
                ].map(([method, path, desc]) => (
                  <div
                    key={path}
                    className="flex items-center gap-3 rounded-xl bg-[var(--elevated)] px-3 py-2"
                  >
                    <span className="text-[10px] font-mono text-[var(--accent)] shrink-0 w-16">
                      {method}
                    </span>
                    <code className="text-xs text-white/80 flex-1 font-mono">{path}</code>
                    <span className="text-[10px] text-[var(--text-muted)]">{desc}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section>
            <SectionHeader
              color="#a78bfa"
              label="Avatar 2D"
              description="Imágenes, micrófono y umbral de activación"
            />
            <Card className="space-y-5">
              <Field label="Micrófono" hint="Fuente de audio para detección de voz">
                <Dropdown
                  options={[
                    { value: "", label: "Micrófono por defecto" },
                    ...mics.map((m) => ({
                      value: m.deviceId,
                      label: m.label || `Micrófono ${m.deviceId.slice(0, 8)}`,
                    })),
                  ]}
                  value={avatarSettings.micId}
                  onChange={(val) => updateAvatar({ micId: val })}
                  placeholder="Seleccionar micrófono"
                />
              </Field>

              <Field
                label={`Umbral de activación — ${avatarSettings.threshold}%`}
                hint="Sensibilidad para pasar a imagen activa"
              >
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={avatarSettings.threshold}
                    onChange={(e) =>
                      updateAvatar({ threshold: Number(e.target.value) })
                    }
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
                    style={{ background: `linear-gradient(to right, var(--accent) ${avatarSettings.threshold}%, var(--elevated) ${avatarSettings.threshold}%)` }}
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                    <span>Muy sensible</span>
                    <span>Poco sensible</span>
                  </div>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                {(["idle", "active"] as const).map((kind) => {
                  const src =
                    kind === "idle"
                      ? avatarSettings.idleImage
                      : avatarSettings.activeImage;
                  const name =
                    kind === "idle"
                      ? avatarSettings.idleImageName
                      : avatarSettings.activeImageName;
                  return (
                    <Field
                      key={kind}
                      label={kind === "idle" ? "Imagen idle" : "Imagen activa"}
                      hint={name || undefined}
                    >
                      <div className="space-y-2">
                        {src && (
                          <div className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--elevated)] h-24">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={kind}
                              className="h-full w-full object-contain"
                            />
                            <div
                              className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                kind === "idle"
                                  ? "bg-[var(--elevated)] text-[var(--text-muted)]"
                                  : "bg-[#a78bfa]/20 text-[#a78bfa]"
                              }`}
                            >
                              {kind}
                            </div>
                          </div>
                        )}
                        <input
                          className="amoled-input !py-2 text-xs"
                          placeholder="URL de imagen..."
                          value={src}
                          onChange={(e) =>
                            updateAvatar(
                              kind === "idle"
                                ? { idleImage: e.target.value, idleImageName: "" }
                                : { activeImage: e.target.value, activeImageName: "" }
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0] ?? null;
                              void handleAvatarImageFile(kind, file);
                            };
                            input.click();
                          }}
                          className="amoled-button-ghost w-full !py-2 text-xs"
                        >
                          Subir archivo
                        </button>
                      </div>
                    </Field>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => void pushAvatarToServer()}
                  className="amoled-button flex-1 !py-2.5 text-sm"
                >
                  Guardar y enviar al servidor
                </button>
              </div>
            </Card>
          </section>

          <section>
            <SectionHeader
              color="#34d399"
              label="Chat overlay para OBS"
              description="URL del overlay de chat y componente personalizado"
            />
            <Card className="space-y-4">
              <Field label="URL del overlay" hint="Pega esta URL como fuente Browser en OBS">
                <div className="flex gap-2">
                  <div className="amoled-input flex-1 !py-2.5 text-xs font-mono text-[var(--text-muted)] select-all overflow-hidden text-ellipsis whitespace-nowrap cursor-text">
                    {obsUrl}
                  </div>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(obsUrl);
                      showToast("URL copiada");
                    }}
                    className="amoled-button !px-4 !py-2.5 text-xs shrink-0"
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Reemplaza <code className="text-[var(--accent)]">CANAL</code> con el nombre del canal y{" "}
                  <code className="text-[var(--accent)]">platform</code> con{" "}
                  <code className="text-[var(--accent)]">twitch</code> o{" "}
                  <code className="text-[var(--accent)]">kick</code>.
                </p>
              </Field>

              <Field label="Componente de mensajes" hint={obsCodeDirty ? "Cambios sin guardar" : "Guardado"}>
                <textarea
                  className="amoled-input font-mono text-[11px] min-h-[160px]"
                  value={obsCodeDraft}
                  onChange={(e) => {
                    setObsCodeDraft(e.target.value);
                    setObsCodeDirty(e.target.value !== obsCode);
                  }}
                  spellCheck={false}
                />
              </Field>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleResetObs()}
                  className="amoled-button-ghost !py-2.5 text-xs"
                >
                  Restablecer
                </button>
                <button
                  onClick={() => void handleSaveObs()}
                  disabled={!obsCodeDirty}
                  className="amoled-button flex-1 !py-2.5 text-sm"
                >
                  {obsCodeDirty ? "Guardar componente" : "Sin cambios"}
                </button>
              </div>
            </Card>
          </section>

          <section>
            <SectionHeader
              color="#60a5fa"
              label="Overlay en vivo"
              description="URL para el overlay del editor en OBS / navegador"
            />
            <Card className="space-y-4">
              <Field label="URL del overlay en vivo">
                <div className="flex gap-2">
                  <div className="amoled-input flex-1 !py-2.5 text-xs font-mono text-[var(--text-muted)] overflow-hidden text-ellipsis whitespace-nowrap">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/overlay/live`
                      : "http://localhost:3000/overlay/live"}
                  </div>
                  <button
                    onClick={() => {
                      const url =
                        typeof window !== "undefined"
                          ? `${window.location.origin}/overlay/live`
                          : "";
                      void navigator.clipboard.writeText(url);
                      showToast("URL copiada");
                    }}
                    className="amoled-button !px-4 !py-2.5 text-xs shrink-0"
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Agrega{" "}
                  <code className="text-[var(--accent)]">?scene=ID</code> para cargar
                  una escena específica. El servidor bridge actualiza el overlay en
                  tiempo real vía WebSocket.
                </p>
              </Field>
              <Field
                label="Cámara en el overlay"
                hint="Sin permiso de cámara en Browser Source"
              >
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  RawenChat captura la webcam una sola vez y la comparte por WebRTC
                  a través del canal <code className="text-[var(--accent)]">/camera/view</code> del
                  puente. El overlay live la recibe como video nativo — no hace
                  falta fuente extra en OBS ni permiso de cámara en Browser Source.
                  Solo mantén la app abierta con un widget Webcam activo.
                </p>
              </Field>
            </Card>
          </section>

        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--card)] px-5 py-3 text-sm font-medium shadow-2xl text-[var(--accent)]">
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OverlayCanvas } from "../OverlayCanvas";
import { STORAGE_KEYS } from "@/constants/config";
import {
  OVERLAY_SCENE_SERVER_URL,
  readOverlaySceneRecordFromServer,
  readOverlaySettingsFromServer,
  readStoredOverlaySettings,
  sceneMatchesParam,
} from "@/utils/overlay";
import { openBridgeSocket } from "@/utils/socket";
import { getFromStorage, saveToStorage } from "@/utils/storage";
import { readOverlaySessionFromBridge } from "@/utils/alerts";
import { useOverlayAlerts } from "@/hooks";
import type { OverlaySceneConfig, OverlaySettings } from "@/types/overlay";

const SERVER_POLL_INTERVAL_MS = 2000;

function createEmptyScene(): OverlaySceneConfig {
  return {
    id: "empty",
    name: "Empty",
    width: 1920,
    height: 1080,
    backgroundColor: "transparent",
    backgroundAssetId: null,
    widgetAccentColor: "",
    snapToGrid: false,
    showGuides: false,
    widgets: [],
    assets: [],
    updatedAt: new Date(0).toISOString(),
  };
}

function pickScene(
  settings: OverlaySettings | null | undefined,
  preferredId: string | null,
): OverlaySceneConfig | null {
  if (!settings?.scenes?.length) return null;
  // Si la URL pide una escena concreta, es estricto: nada de fallbacks,
  // para que OBS pueda avisar que la escena no existe.
  // Coincide por id o por nombre ("talking" → "Talking").
  if (preferredId) {
    return settings.scenes.find((s) => sceneMatchesParam(s, preferredId)) ?? null;
  }
  return (
    settings.scenes.find((s) => s.id === settings.activeSceneId) ??
    settings.scenes[0] ??
    null
  );
}

/**
 * OBS corre en su propio browser context (sin localStorage compartido con la
 * app), así que la sesión llega por dos vías: estampada en la escena y por el
 * canal dedicado /overlay-session del bridge. La sembramos aquí para que
 * useSessionChannel/useSessionPlatform funcionen igual que en la app.
 */
function applySession(channel: string | undefined, platform: "twitch" | "kick" | undefined) {
  if (typeof channel === "string") {
    const current = getFromStorage<string>(STORAGE_KEYS.LAST_CHANNEL)?.trim() ?? "";
    if (current !== channel) {
      saveToStorage(STORAGE_KEYS.LAST_CHANNEL, channel);
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.LAST_CHANNEL, newValue: channel }));
    }
  }
  if (platform) {
    const current = getFromStorage<string>(STORAGE_KEYS.LAST_PLATFORM);
    if (current !== platform) {
      saveToStorage(STORAGE_KEYS.LAST_PLATFORM, platform);
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.LAST_PLATFORM, newValue: platform }));
    }
  }
}

function applySessionFromScene(scene: OverlaySceneConfig) {
  applySession(scene.sessionChannel, scene.sessionPlatform);
}

function OverlayLivePageContent() {
  const searchParams = useSearchParams();
  const sceneIdParam = searchParams.get("scene");

  // Alertas del bridge → evento de window para el canvas
  useOverlayAlerts();

  // Start empty — config loads asynchronously to avoid flashing stale defaults
  const [scene, setScene] = useState<OverlaySceneConfig>(createEmptyScene);
  // La URL pidió un id de escena que no existe en ninguna fuente
  const [sceneMissing, setSceneMissing] = useState(false);

  const latestAtRef   = useRef(0);
  const setSceneRef   = useRef(setScene);
  const sceneIdRef    = useRef(sceneIdParam);
  setSceneRef.current = setScene;
  sceneIdRef.current  = sceneIdParam;

  useEffect(() => {
    let disposed = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let bc: BroadcastChannel | null = null;

    function apply(next: OverlaySceneConfig, fromPoll = false) {
      if (disposed || !next) return;
      const at = Date.parse(next.updatedAt) || Date.now();
      if (fromPoll && at > 0 && at <= latestAtRef.current) return;
      latestAtRef.current = Math.max(latestAtRef.current, at);
      applySessionFromScene(next);
      setSceneRef.current(next);
    }

    const poll = async () => {
      const wanted = sceneIdRef.current;

      try {
        const local = readStoredOverlaySettings();
        const fromLocal = pickScene(local, wanted);
        if (fromLocal) {
          setSceneMissing(false);
          apply(fromLocal, true);
        } else if (wanted && local?.scenes?.length) {
          setSceneMissing(true);
        }
      } catch {}

      // Each OBS URL keeps its own scene even if the editor switches active scene
      try {
        if (wanted) {
          const res = await fetch(
            `${OVERLAY_SCENE_SERVER_URL}?id=${encodeURIComponent(wanted)}`,
            { cache: "no-store" }
          );
          if (res.ok) {
            const record = await res.json() as { scene?: OverlaySceneConfig };
            if (record?.scene && sceneMatchesParam(record.scene, wanted)) {
              setSceneMissing(false);
              apply(record.scene, true);
              return;
            }
          }
        }
      } catch {}

      const settings = await readOverlaySettingsFromServer();
      if (settings?.scenes?.length) {
        const picked = pickScene(settings, wanted);
        if (picked) {
          setSceneMissing(false);
          apply(picked, true);
          return;
        }
        // Hay escenas en el server pero ninguna coincide con el id pedido
        if (wanted) { setSceneMissing(true); return; }
      }
      const record = await readOverlaySceneRecordFromServer();
      if (record?.scene && (!wanted || sceneMatchesParam(record.scene, wanted))) {
        setSceneMissing(false);
        apply(record.scene, true);
      } else if (wanted) {
        setSceneMissing(true);
      }

      // Canal dedicado de sesión: la vía más directa para el toggle de plataforma
      const session = await readOverlaySessionFromBridge();
      if (session) applySession(session.channel, session.platform);
    };

    const socket = openBridgeSocket("overlay", {
      onOpen: () => void poll(),
      onMessage: (data) => {
        const msg = data as {
          type?: string;
          scene?: OverlaySceneConfig;
          session?: { channel?: string; platform?: "twitch" | "kick" };
        } | null;
        if (msg?.type === "OVERLAY_SCENE_UPDATED" && msg.scene) {
          const wanted = sceneIdRef.current;
          if (!wanted || sceneMatchesParam(msg.scene, wanted)) apply(msg.scene);
        }
        if (msg?.type === "OVERLAY_SESSION_UPDATED" && msg.session) {
          applySession(msg.session.channel, msg.session.platform);
        }
      },
    });

    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel(STORAGE_KEYS.OVERLAY_SCENE);
      bc.onmessage = (e: MessageEvent<OverlaySceneConfig>) => {
        if (e.data) {
          const wanted = sceneIdRef.current;
          if (!wanted || sceneMatchesParam(e.data, wanted)) apply(e.data);
        }
      };
    }

    void poll();
    pollTimer = setInterval(() => void poll(), SERVER_POLL_INTERVAL_MS);

    return () => {
      disposed = true;
      clearInterval(pollTimer!);
      socket.dispose();
      bc?.close();
    };
  }, []);

  return (
    <>
      {/* OBS requires html/body/main all transparent */}
      <style>{`
        html, body { background: transparent !important; margin: 0; padding: 0; }
      `}</style>

      <main
        style={{
          position: "fixed",
          inset: 0,
          background: "transparent",
          overflow: "hidden",
        }}
      >
        <div style={sceneMissing ? { display: "none" } : { display: "contents" }}>
          <OverlayCanvas
            scene={scene}
            className="bg-transparent"
          />
        </div>
        {sceneMissing && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-4 py-2 rounded-md bg-[#141416]/95 border border-[#27272a] shadow-lg text-sm font-medium text-white/80">
              No scene{sceneIdParam ? <span className="text-white/40"> “{sceneIdParam}”</span> : null}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function OverlayLivePage() {
  return (
    <Suspense fallback={null}>
      <OverlayLivePageContent />
    </Suspense>
  );
}

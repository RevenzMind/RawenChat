"use client";

import { useEffect, useRef, useState } from "react";
import type { WidgetViewProps } from "@/types/overlay";
import { getAssetById } from "@/utils/overlay";
import { acquireCamera, releaseCamera } from "@/utils/camera-hub";
import { getFromStorage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";
import { BRIDGE_CHANNELS } from "@/utils/socket";
import { getWidgetSurfaceStyle } from "@/utils/widgets";

// Preview del editor: muestra el stream local de la cámara vía getUserMedia
function WebcamLiveView({ cameraId = "" }: { cameraId?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    setError(null);

    void acquireCamera().then((stream) => {
      if (disposed) return;
      if (!stream) { setError("Sin cámara"); return; }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => undefined);
      }
    });

    return () => {
      disposed = true;
      if (videoRef.current) videoRef.current.srcObject = null;
      releaseCamera();
    };
  }, [cameraId]);

  if (error) return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
      <span className="text-[0.65em] text-white/50 uppercase tracking-wider">{error}</span>
    </div>
  );

  return (
    <video ref={videoRef} autoPlay playsInline muted
      className="absolute inset-0 h-full w-full object-cover" />
  );
}

// Live/OBS: recibe el track de video por WebRTC, sin pedir permiso de cámara
function WebcamRelayView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"waiting" | "connecting" | "live" | "error">("waiting");

  useEffect(() => {
    let disposed = false;
    let ws: WebSocket | null = null;
    let pc: RTCPeerConnection | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let viewerId = "";

    const ICE_SERVERS: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
    ];

    function sendSignal(msg: object) {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    }

    function closePc() {
      try { pc?.close(); } catch {}
      pc = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    async function handleOffer(sdp: string) {
      closePc();
      setStatus("connecting");

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = ({ candidate }) => {
        if (disposed || !candidate) return;
        sendSignal({ type: "ice", candidate: candidate.toJSON(), viewerId });
      };

      pc.ontrack = (event) => {
        if (disposed) return;
        const [stream] = event.streams;
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
          setStatus("live");
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (disposed) return;
        const s = pc?.iceConnectionState;
        if (s === "failed" || s === "closed") {
          setStatus("waiting");
          closePc();
        }
      };

      try {
        await pc.setRemoteDescription({ type: "offer", sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: "answer", sdp: answer.sdp, viewerId });
      } catch (e) {
        console.error("WebRTC answer error:", e);
        closePc();
        setStatus("error");
      }
    }

    async function handleIce(candidate: RTCIceCandidateInit) {
      if (!pc) return;
      try { await pc.addIceCandidate(candidate); }
      catch { /* candidato tardío, se ignora */ }
    }

    function connect() {
      if (disposed) return;
      const ws_ = new WebSocket(BRIDGE_CHANNELS.cameraView);
      ws = ws_;

      ws_.onopen = () => {
        if (disposed) { ws_.close(); return; }
        setStatus("waiting");
      };

      ws_.onmessage = async (event) => {
        if (disposed) return;
        try {
          const msg = JSON.parse(String(event.data));
          if (msg.type === "connected") { viewerId = msg.viewerId as string; }
          if (msg.type === "offer")     { await handleOffer(msg.sdp as string); }
          if (msg.type === "ice")       { await handleIce(msg.candidate as RTCIceCandidateInit); }
        } catch {}
      };

      ws_.onclose = () => {
        if (ws === ws_) ws = null;
        closePc();
        if (!disposed) {
          setStatus("waiting");
          retryTimer = setTimeout(connect, 2000);
        }
      };
      ws_.onerror = () => ws_?.close();
    }

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
      closePc();
    };
  }, []);

  return (
    <>
      <video ref={videoRef} autoPlay playsInline muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ display: status === "live" ? "block" : "none" }} />
      {status !== "live" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 pointer-events-none gap-1 px-3 text-center">
          <span className="text-[0.7em] text-white/50 uppercase tracking-wider">
            {status === "connecting" ? "Conectando…" : status === "error" ? "Error WebRTC" : "Esperando cámara…"}
          </span>
          {status === "waiting" && (
            <span className="text-[0.55em] text-white/30 leading-tight">
              Mantén RawenChat abierto con un widget Webcam activo
            </span>
          )}
        </div>
      )}
    </>
  );
}

export function WebcamFrameView({ scene, widget, interactive }: WidgetViewProps<"webcamFrame">) {
  const primaryAsset = getAssetById(scene, widget.assets.primaryAssetId);
  const { sourceKind } = widget.data;
  const cameraId = getFromStorage<string>(STORAGE_KEYS.CAMERA_DEVICE_ID) ?? "";

  return (
    <div className="h-full w-full border shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden relative"
      style={getWidgetSurfaceStyle(scene, widget)}>

      {/* Asset de video estático como fondo decorativo */}
      {primaryAsset && primaryAsset.kind === "video" ? (
        <video src={primaryAsset.src} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline />
      ) : null}

      {sourceKind === "webcam" && (
        interactive
          ? <WebcamLiveView key={cameraId} cameraId={cameraId} />
          : <WebcamRelayView />
      )}

      {sourceKind === "avatar" && (
        <iframe src="/avatar" title="Avatar 2D"
          className="absolute inset-0 h-full w-full border-0 bg-transparent pointer-events-none"
          allow="autoplay; camera; microphone" />
      )}

      {/* Badge visible solo en el editor */}
      {interactive && sourceKind !== "none" && (
        <div className="absolute top-2 left-2 pointer-events-none z-10">
          <span className="rounded-[3px] bg-black/60 border border-white/15 px-1.5 py-0.5 text-[9px] text-white/70 uppercase tracking-wider">
            {sourceKind === "webcam" ? "📷 live" : "🎭 avatar"}
          </span>
        </div>
      )}

      {sourceKind === "none" && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),rgba(0,0,0,0.55))] pointer-events-none" />
          <div className="absolute inset-4 border border-dashed border-white/20 rounded-[inherit] flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="text-[0.72em] uppercase tracking-[0.28em] text-white/50">{widget.data.label}</div>
            <div className="text-[1em] font-semibold">{widget.data.sourceLabel}</div>
          </div>
        </>
      )}
    </div>
  );
}

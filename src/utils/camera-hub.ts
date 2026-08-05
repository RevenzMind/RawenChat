import { getFromStorage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";
import { BRIDGE_CHANNELS } from "@/utils/socket";
import type { OverlaySceneConfig, OverlaySettings, WebcamFrameWidget } from "@/types/overlay";

let sharedStream: MediaStream | null = null;
let sharedDeviceId = "";
let acquireCount = 0;
let acquirePromise: Promise<MediaStream | null> | null = null;

function buildConstraints(deviceId: string): MediaStreamConstraints {
  const video: MediaTrackConstraints = {
    width: { ideal: 4096 },
    height: { ideal: 2160 },
    frameRate: { ideal: 60 },
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  };
  return { video, audio: false };
}

async function openCamera(deviceId: string): Promise<MediaStream | null> {
  const attempts: MediaStreamConstraints[] = [
    buildConstraints(deviceId),
    ...(deviceId ? [buildConstraints("")] : []),
  ];
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      // fall through to the next attempt
    }
  }
  return null;
}

export async function acquireCamera(): Promise<MediaStream | null> {
  const deviceId = getFromStorage<string>(STORAGE_KEYS.CAMERA_DEVICE_ID) ?? "";
  acquireCount += 1;

  if (sharedStream && sharedDeviceId === deviceId) return sharedStream;

  if (sharedStream) {
    sharedStream.getTracks().forEach((t) => t.stop());
    sharedStream = null;
  }

  if (!acquirePromise) {
    acquirePromise = openCamera(deviceId).then((stream) => {
      acquirePromise = null;
      if (!stream) return null;
      sharedStream = stream;
      sharedDeviceId = deviceId;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (sharedStream === stream) {
          sharedStream = null;
          sharedDeviceId = "";
        }
      });
      return stream;
    });
  }
  return acquirePromise;
}

export function releaseCamera(): void {
  acquireCount = Math.max(0, acquireCount - 1);
  if (acquireCount > 0) return;
  sharedStream?.getTracks().forEach((t) => t.stop());
  sharedStream = null;
  sharedDeviceId = "";
}

function sceneHasWebcam(scene: OverlaySceneConfig | null | undefined): boolean {
  return (scene?.widgets ?? []).some(
    (w) =>
      w.kind === "webcamFrame" &&
      (w as WebcamFrameWidget).data.sourceKind === "webcam" &&
      w.visible !== false,
  );
}

export function shouldPublishCamera(): boolean {
  try {
    const settings = getFromStorage<OverlaySettings>(STORAGE_KEYS.OVERLAY_SETTINGS);
    if (settings?.scenes?.length) {
      return settings.scenes.some(sceneHasWebcam);
    }
    return sceneHasWebcam(getFromStorage<OverlaySceneConfig>(STORAGE_KEYS.OVERLAY_SCENE));
  } catch {
    return false;
  }
}

// STUN keeps WebRTC working outside loopback; local relays work without it.
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

interface PeerEntry {
  pc: RTCPeerConnection;
  viewerId: string;
  disposed: boolean;
}

let publishUsers = 0;
let publishCleanup: (() => void) | null = null;

export function startCameraPublisher(): void {
  publishUsers += 1;
  if (publishCleanup) return;

  let disposed = false;
  let ws: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  const peers = new Map<string, PeerEntry>();

  function sendSignal(msg: object) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  function closePeer(viewerId: string) {
    const entry = peers.get(viewerId);
    if (!entry) return;
    entry.disposed = true;
    try {
      entry.pc.close();
    } catch {}
    peers.delete(viewerId);
  }

  async function createOffer(viewerId: string, stream: MediaStream) {
    closePeer(viewerId);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const entry: PeerEntry = { pc, viewerId, disposed: false };
    peers.set(viewerId, entry);

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = ({ candidate }) => {
      if (entry.disposed || !candidate) return;
      sendSignal({ type: "ice", candidate: candidate.toJSON(), viewerId });
    };

    pc.oniceconnectionstatechange = () => {
      if (entry.disposed) return;
      const state = pc.iceConnectionState;
      if (state === "failed" || state === "disconnected" || state === "closed") {
        closePeer(viewerId);
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ type: "offer", sdp: offer.sdp, viewerId });
    } catch (error) {
      console.error("WebRTC offer error:", error);
      closePeer(viewerId);
    }
  }

  async function handleAnswer(viewerId: string, sdp: string) {
    const entry = peers.get(viewerId);
    if (!entry) return;
    try {
      await entry.pc.setRemoteDescription({ type: "answer", sdp });
    } catch (error) {
      console.error("WebRTC setRemoteDescription error:", error);
    }
  }

  async function handleIce(viewerId: string, candidate: RTCIceCandidateInit) {
    const entry = peers.get(viewerId);
    if (!entry) return;
    try {
      await entry.pc.addIceCandidate(candidate);
    } catch {
      // late candidates can be ignored safely
    }
  }

  function connect() {
    if (disposed) return;
    ws = new WebSocket(BRIDGE_CHANNELS.cameraPublish);

    ws.onmessage = async (event) => {
      if (disposed) return;
      try {
        const msg = JSON.parse(String(event.data));

        if (msg.type === "new-viewer") {
          const stream = sharedStream ?? (await acquireCamera());
          if (!stream || disposed) return;
          await createOffer(msg.viewerId as string, stream);
        }

        if (msg.type === "answer") {
          await handleAnswer(msg.viewerId as string, msg.sdp as string);
        }

        if (msg.type === "ice" && msg.viewerId) {
          await handleIce(msg.viewerId as string, msg.candidate as RTCIceCandidateInit);
        }
      } catch (error) {
        console.error("Signaling message error:", error);
      }
    };

    ws.onclose = () => {
      ws = null;
      if (!disposed) retryTimer = setTimeout(connect, 1500);
    };
    ws.onerror = () => ws?.close();
  }

  connect();
  void acquireCamera();

  publishCleanup = () => {
    disposed = true;
    if (retryTimer) clearTimeout(retryTimer);
    ws?.close();
    ws = null;
    for (const [id] of peers) closePeer(id);
    peers.clear();
    releaseCamera();
  };
}

export function stopCameraPublisher(): void {
  publishUsers = Math.max(0, publishUsers - 1);
  if (publishUsers > 0) return;
  publishCleanup?.();
  publishCleanup = null;
}

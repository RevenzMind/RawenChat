const BRIDGE_WS_BASE = "ws://127.0.0.1:3002";

export const BRIDGE_CHANNELS = {
  overlay: `${BRIDGE_WS_BASE}/overlay`,
  avatar: `${BRIDGE_WS_BASE}/avatar`,
  cameraPublish: `${BRIDGE_WS_BASE}/camera/publish`,
  cameraView: `${BRIDGE_WS_BASE}/camera/view`,
} as const;

export type BridgeChannel = keyof typeof BRIDGE_CHANNELS;

export interface ReconnectingSocketOptions {
  reconnectDelayMs?: number;
  onOpen?: (socket: WebSocket) => void;
  onMessage?: (data: unknown, raw: string) => void;
}

export interface ReconnectingSocket {
  send: (payload: object) => void;
  dispose: () => void;
}

export function openBridgeSocket(
  channel: BridgeChannel,
  options: ReconnectingSocketOptions = {},
): ReconnectingSocket {
  const { reconnectDelayMs = 1500, onOpen, onMessage } = options;

  let socket: WebSocket | null = null;
  let disposed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (disposed) return;
    socket = new WebSocket(BRIDGE_CHANNELS[channel]);

    socket.onopen = () => onOpen?.(socket!);

    socket.onmessage = (event) => {
      const raw = String(event.data);
      try {
        onMessage?.(JSON.parse(raw), raw);
      } catch {
        onMessage?.(null, raw);
      }
    };

    socket.onclose = () => {
      socket = null;
      if (!disposed) reconnectTimer = setTimeout(connect, reconnectDelayMs);
    };

    socket.onerror = () => socket?.close();
  };

  connect();

  return {
    send(payload: object) {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    },
    dispose() {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      socket = null;
    },
  };
}

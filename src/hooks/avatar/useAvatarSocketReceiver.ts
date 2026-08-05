"use client";

import { useEffect, useState } from "react";
import { openBridgeSocket } from "@/utils/socket";

export function useAvatarSocketReceiver(onSettingsUpdated?: () => void): boolean {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const socket = openBridgeSocket("avatar", {
      reconnectDelayMs: 2000,
      onOpen: (ws) => ws.send(JSON.stringify({ type: "PING" })),
      onMessage: (data) => {
        const message = data as { type?: string; value?: unknown } | null;
        if (!message) return;
        if (message.type === "SET_ACTIVE") {
          setIsActive(Boolean(message.value));
        }
        if (message.type === "AVATAR_SETTINGS_UPDATED") {
          onSettingsUpdated?.();
        }
      },
    });

    return () => socket.dispose();
  }, [onSettingsUpdated]);

  return isActive;
}

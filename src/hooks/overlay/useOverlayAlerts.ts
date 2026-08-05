"use client";

import { useEffect } from "react";
import { openBridgeSocket } from "@/utils/socket";
import { dispatchOverlayAlert } from "@/utils/alerts";
import type { OverlayAlert } from "@/types/overlay";

export function useOverlayAlerts(): void {
  useEffect(() => {
    const socket = openBridgeSocket("overlay", {
      onMessage: (data) => {
        const msg = data as { type?: string; alert?: OverlayAlert } | null;
        if (msg?.type === "OVERLAY_ALERT" && msg.alert) {
          dispatchOverlayAlert(msg.alert);
        }
      },
    });
    return () => socket.dispose();
  }, []);
}

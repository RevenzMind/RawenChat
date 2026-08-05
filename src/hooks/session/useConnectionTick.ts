"use client";

import { useEffect, useState } from "react";
import { LASTFM_CONNECTION_CHANGED_EVENT } from "@/utils/lastfm";
import { OVERLAY_SESSION_CHANGED_EVENT } from "@/utils/overlay";
import { TWITCH_AUTH_CHANGED_EVENT } from "@/utils/twitch";

export const CONNECTION_TICK_EVENTS = [
  "storage",
  "rawenchat-connections-changed",
  TWITCH_AUTH_CHANGED_EVENT,
  LASTFM_CONNECTION_CHANGED_EVENT,
  OVERLAY_SESSION_CHANGED_EVENT,
];

export function useConnectionTick(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    CONNECTION_TICK_EVENTS.forEach((e) => window.addEventListener(e, bump));
    return () => CONNECTION_TICK_EVENTS.forEach((e) => window.removeEventListener(e, bump));
  }, []);

  return tick;
}

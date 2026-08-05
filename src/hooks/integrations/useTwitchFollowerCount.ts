"use client";

import { useEffect, useState } from "react";
import { TWITCH_CLIENT_ID, readTwitchAuth } from "@/utils/twitch";

const REFRESH_INTERVAL_MS = 60_000;

export function useTwitchFollowerCount(channel: string, platform: string): number | null {
  const [followers, setFollowers] = useState<number | null>(null);

  useEffect(() => {
    if (platform !== "twitch" || !channel) {
      setFollowers(null);
      return;
    }
    let active = true;

    async function load() {
      const auth = readTwitchAuth();
      if (!auth?.accessToken) return;
      try {
        const headers = { "Client-Id": TWITCH_CLIENT_ID, Authorization: `Bearer ${auth.accessToken}` };
        const uRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(channel)}`, { headers });
        const userId = (await uRes.json())?.data?.[0]?.id as string | undefined;
        if (!userId || !active) return;
        const fRes = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}&first=1`, { headers });
        const total = (await fRes.json())?.total as number | undefined;
        if (active && typeof total === "number") setFollowers(total);
      } catch {}
    }

    void load();
    const t = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(t);
    };
  }, [channel, platform]);

  return followers;
}

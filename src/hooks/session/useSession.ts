"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/constants/config";
import { getFromStorage } from "@/utils/storage";
import type { ChatPlatform } from "@/utils/platform";

function readSessionPlatform(): ChatPlatform {
  const saved = getFromStorage<ChatPlatform>(STORAGE_KEYS.LAST_PLATFORM);
  return saved === "kick" ? "kick" : "twitch";
}

function readSessionChannel(): string {
  return getFromStorage<string>(STORAGE_KEYS.LAST_CHANNEL)?.trim() ?? "";
}

export function useSessionPlatform(): ChatPlatform {
  const [platform, setPlatform] = useState<ChatPlatform>(readSessionPlatform);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.LAST_PLATFORM) setPlatform(readSessionPlatform());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return platform;
}

export function useSessionChannel(): string {
  const [channel, setChannel] = useState<string>(readSessionChannel);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.LAST_CHANNEL) setChannel(readSessionChannel());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return channel;
}

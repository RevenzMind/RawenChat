import { STORAGE_KEYS, DEFAULTS, APP_INFO } from "@/constants/config";
import { ACCENT_PRESETS, DEFAULT_ACCENT } from "@/utils/accent";
import { getFromStorage, removeFromStorage, saveToStorage } from "@/utils/storage";

export interface AppConfig {
  tts: {
    enabled: boolean;
    language: string;
    voice: string;
    volume: number;
  };
  chat: {
    autoScroll: boolean;
  };
  appearance: {
    accentColor: string;
    themeMode: "dark" | "amoled";
  };
  devices: {
    cameraId: string;
    micId: string;
  };
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  tts: {
    enabled: false,
    language: "es-ES",
    voice: "",
    volume: 100,
  },
  chat: {
    autoScroll: true,
  },
  appearance: {
    accentColor: DEFAULT_ACCENT,
    themeMode: "dark",
  },
  devices: {
    cameraId: "",
    micId: "",
  },
};

export const COLOR_PALETTE = {
  presets: ACCENT_PRESETS,
  defaultAccent: DEFAULT_ACCENT,
  themeColors: APP_INFO,
};

export function getAppConfig(): AppConfig {
  return {
    tts: {
      enabled: getFromStorage<boolean>(STORAGE_KEYS.TTS_ENABLED) ?? DEFAULT_APP_CONFIG.tts.enabled,
      language: getFromStorage<string>(STORAGE_KEYS.TTS_LANGUAGE) ?? DEFAULT_APP_CONFIG.tts.language,
      voice: getFromStorage<string>(STORAGE_KEYS.TTS_VOICE) ?? DEFAULT_APP_CONFIG.tts.voice,
      volume: getFromStorage<number>(STORAGE_KEYS.TTS_VOLUME) ?? DEFAULT_APP_CONFIG.tts.volume,
    },
    chat: {
      autoScroll: true,
    },
    appearance: {
      accentColor: DEFAULT_ACCENT,
      themeMode: "dark",
    },
    devices: {
      cameraId: getFromStorage<string>(STORAGE_KEYS.CAMERA_DEVICE_ID) ?? "",
      micId: "",
    },
  };
}

export function resetAppConfig(): void {
  const keysToRemove = [
    STORAGE_KEYS.TTS_ENABLED,
    STORAGE_KEYS.TTS_LANGUAGE,
    STORAGE_KEYS.TTS_VOICE,
    STORAGE_KEYS.TTS_VOLUME,
    STORAGE_KEYS.OBS_CSS,
    STORAGE_KEYS.CAMERA_DEVICE_ID,
    "rawenchat_accent",
  ];

  keysToRemove.forEach((key) => removeFromStorage(key));

  if (typeof window !== "undefined") {
    document.documentElement.style.setProperty("--accent", DEFAULT_ACCENT);
    document.documentElement.style.setProperty("--accent-muted", `${DEFAULT_ACCENT}15`);
    document.documentElement.style.setProperty("--accent-border", `${DEFAULT_ACCENT}30`);
    window.dispatchEvent(new Event("rawenchat-config-reset"));
  }
}

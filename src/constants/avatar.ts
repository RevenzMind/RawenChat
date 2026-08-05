import { BRIDGE_CHANNELS } from "@/utils/socket";

export const AVATAR_WS_URL = BRIDGE_CHANNELS.avatar;

export const AVATAR_STORAGE_KEYS = {
  MIC_ID: "avatar-mic-id",
  THRESHOLD: "avatar-threshold",
  IDLE_IMAGE: "avatar-img-idle",
  ACTIVE_IMAGE: "avatar-img-active",
} as const;

export const AVATAR_EVENTS = {
  RELOAD_MIC: "reload-avatar-mic",
  STATE_CHANGE: "avatar-state-change",
} as const;

export const AVATAR_DEFAULTS = {
  THRESHOLD: 50,
  SAMPLE_INTERVAL_MS: 50,
  SILENCE_HOLD_MS: 150,
  MIN_NOISE_PERCENT: 12,
  IDLE_IMAGE: "https://cdn.rawencat.tech/idle.png",
  ACTIVE_IMAGE:
    "https://cdn.rawencat.tech/active.png",
} as const;

export interface AvatarSettings {
  micId: string;
  threshold: number;
  idleImage: string;
  activeImage: string;
  idleImageName: string;
  activeImageName: string;
}

export const DEFAULT_AVATAR_SETTINGS: AvatarSettings = {
  micId: "",
  threshold: AVATAR_DEFAULTS.THRESHOLD,
  idleImage: AVATAR_DEFAULTS.IDLE_IMAGE,
  activeImage: AVATAR_DEFAULTS.ACTIVE_IMAGE,
  idleImageName: "",
  activeImageName: "",
};

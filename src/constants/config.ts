export const STORAGE_KEYS = {
  COMMANDS: "rawenchat_commands",
  AVATAR_SETTINGS: "rawenchat_avatar_settings",
  TTS_ENABLED: "rawenchat_tts_enabled",
  TTS_LANGUAGE: "rawenchat_tts_language",
  TTS_VOICE: "rawenchat_tts_voice",
  TTS_VOLUME: "rawenchat_tts_volume",
  OBS_CSS: "rawenchat_obs_css",
  HIDE_OBS_SECTION: "rawenchat_hide_obs_section",
  LAST_CHANNEL: "rawenchat_last_channel",
  LAST_PLATFORM: "rawenchat_last_platform",
  OVERLAY_SCENE: "rawenchat_overlay_scene",
  OVERLAY_SETTINGS: "rawenchat_overlay_settings",
  CAMERA_DEVICE_ID: "rawenchat_camera_device_id",
  LASTFM_CONNECTION: "rawenchat_lastfm_connection",
  TWITCH_API: "rawenchat_twitch_api",
  COMMAND_VOLUME: "rawenchat_command_volume",
} as const;

export const APP_LANGUAGE = "es-ES";

export const DEFAULTS = {
  COMMAND_TIMEOUT_MS: 5000,
  COMMAND_ACTION_TYPE: "key" as const,
} as const;

export const APP_INFO = {
  NAME: "RawenChat",
  DESCRIPTION:
    "Visor de chat de Twitch y Kick con soporte de TTS y comandos personalizados",
  THEME_COLOR: "#ffb07a",
  APP_ID: "com.rawenchat.app",
} as const;

export const DEV_CONFIG = {
  DEV_URL: "http://localhost:3000",
} as const;

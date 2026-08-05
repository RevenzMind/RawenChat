import { STORAGE_KEYS } from "@/constants/config";
import { getFromStorage, saveToStorage, removeFromStorage } from "@/utils/storage";


export interface LastFmConnection {
  apiKey: string;
  username: string;
}

export interface LastFmTrack {
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  isPlaying: boolean;
  source: string;
}


/** Evento de window para avisar que la conexión de Last.fm cambió (conectar/desconectar). */
export const LASTFM_CONNECTION_CHANGED_EVENT = "rawenchat-lastfm-connection";

function notifyLastFmConnectionChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LASTFM_CONNECTION_CHANGED_EVENT));
  }
}

export function readLastFmConnection(): LastFmConnection | null {
  return getFromStorage<LastFmConnection>(STORAGE_KEYS.LASTFM_CONNECTION);
}

export function saveLastFmConnection(conn: LastFmConnection): void {
  saveToStorage(STORAGE_KEYS.LASTFM_CONNECTION, conn);
  notifyLastFmConnectionChanged();
}

export function clearLastFmConnection(): void {
  removeFromStorage(STORAGE_KEYS.LASTFM_CONNECTION);
  notifyLastFmConnectionChanged();
}


/**
 * Fetch the currently scrobbling track from Last.fm.
 * Free API, no Premium, no CORS issues, works from any browser context.
 */
export async function fetchLastFmNowPlaying(
  apiKey: string,
  username: string,
): Promise<LastFmTrack | null> {
  if (!apiKey || !username) return null;
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${encodeURIComponent(apiKey)}&format=json&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      recenttracks?: {
        track?: Array<{
          "@attr"?: { nowplaying?: string };
          name?: string;
          artist?: { "#text"?: string };
          album?: { "#text"?: string };
          image?: Array<{ "#text"?: string; size?: string }>;
        }>;
      };
    };
    const tracks = data?.recenttracks?.track;
    if (!tracks?.length) return null;
    const latest = tracks[0];
    const isPlaying = latest["@attr"]?.nowplaying === "true";
    if (!isPlaying) return null;

    const albumArt =
      latest.image?.find((img) => img.size === "large")?.["#text"] ||
      latest.image?.find((img) => img.size === "medium")?.["#text"] ||
      latest.image?.find((img) => img.size === "extralarge")?.["#text"] ||
      "";

    return {
      title: latest.name || "",
      artist: latest.artist?.["#text"] || "",
      album: latest.album?.["#text"] || "",
      albumArt,
      isPlaying: true,
      source: "Last.fm",
    };
  } catch {
    return null;
  }
}

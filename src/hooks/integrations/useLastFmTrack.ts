"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LASTFM_CONNECTION_CHANGED_EVENT,
  fetchLastFmNowPlaying,
  readLastFmConnection,
} from "@/utils/lastfm";

export interface LastFmTrack {
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  isPlaying: boolean;
  source: string;
}

const POLL_INTERVAL_MS = 12_000;

export function useLastFmTrack(options: {
  interactive: boolean;
  widgetApiKey?: string;
  widgetUsername?: string;
}) {
  const { interactive, widgetApiKey = "", widgetUsername = "" } = options;
  const [track, setTrack] = useState<LastFmTrack | null>(null);
  const [connTick, setConnTick] = useState(0);

  useEffect(() => {
    const bump = () => setConnTick((t) => t + 1);
    window.addEventListener(LASTFM_CONNECTION_CHANGED_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(LASTFM_CONNECTION_CHANGED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const globalConn = useMemo(() => readLastFmConnection(), [connTick]);
  const apiKey = interactive
    ? globalConn?.apiKey || ""
    : widgetApiKey || globalConn?.apiKey || "";
  const username = interactive
    ? globalConn?.username || ""
    : widgetUsername || globalConn?.username || "";

  useEffect(() => {
    if (!apiKey || !username) {
      setTrack(null);
      return;
    }
    let active = true;
    let fetching = false;

    async function fetchTrack() {
      if (fetching) return;
      fetching = true;
      try {
        const result = await fetchLastFmNowPlaying(apiKey, username);
        if (!active) return;
        setTrack(
          result
            ? {
                title: result.title,
                artist: result.artist,
                album: result.album,
                albumArt: result.albumArt,
                isPlaying: result.isPlaying,
                source: result.source,
              }
            : null
        );
      } catch {
        if (active) setTrack(null);
      } finally {
        fetching = false;
      }
    }

    void fetchTrack();
    const intervalId = setInterval(() => void fetchTrack(), POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [apiKey, username]);

  return { track, apiKey, username };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEYS } from "@/constants/config";
import { getAvailableVoices, speakMessage } from "@/utils/tts";
import { getFromStorage, saveToStorage } from "@/utils/storage";

function loadTTSConfig() {
  return {
    enabled: getFromStorage<boolean>(STORAGE_KEYS.TTS_ENABLED) ?? false,
    language: getFromStorage<string>(STORAGE_KEYS.TTS_LANGUAGE) ?? "es-ES",
    voice: getFromStorage<string>(STORAGE_KEYS.TTS_VOICE) ?? "",
    volume: getFromStorage<number>(STORAGE_KEYS.TTS_VOLUME) ?? 100,
  };
}

export function useTtsSettings() {
  const ttsConfig = loadTTSConfig();
  const [enabled, setEnabledState] = useState(ttsConfig.enabled);
  const [language, setLanguageState] = useState(ttsConfig.language);
  const [voice, setVoiceState] = useState(ttsConfig.voice);
  const [volume, setVolumeState] = useState(ttsConfig.volume);
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);

  const enabledRef = useRef(enabled);
  const volumeRef = useRef(volume);
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    saveToStorage(STORAGE_KEYS.TTS_ENABLED, value);
  }, []);

  const setLanguage = useCallback((value: string) => {
    setLanguageState(value);
    saveToStorage(STORAGE_KEYS.TTS_LANGUAGE, value);
  }, []);

  const setVoice = useCallback((value: string) => {
    setVoiceState(value);
    saveToStorage(STORAGE_KEYS.TTS_VOICE, value);
  }, []);

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
    saveToStorage(STORAGE_KEYS.TTS_VOLUME, value);
  }, []);

  useEffect(() => {
    const loadVoices = async () => {
      setLoadingVoices(true);
      try {
        const voices = await getAvailableVoices(language);
        setAvailableVoices(voices);
        if (voices.length > 0) {
          setVoice(voices[0]);
        }
      } catch (error) {
        console.error("Error loading voices:", error);
      } finally {
        setLoadingVoices(false);
      }
    };

    void loadVoices();
  }, [language, setVoice]);

  const processQueue = useCallback(async () => {
    if (playingRef.current || !enabledRef.current) return;
    if (queueRef.current.length === 0) return;

    playingRef.current = true;
    const message = queueRef.current.shift();

    if (message) {
      try {
        await speakMessage(message, language, voice, volumeRef.current);
      } catch (err) {
        console.error("TTS error:", err);
      }
    }

    playingRef.current = false;
    if (queueRef.current.length > 0) {
      void processQueue();
    }
  }, [language, voice]);

  const enqueue = useCallback(
    (message: string) => {
      if (!enabledRef.current) return;
      queueRef.current.push(message);
      void processQueue();
    },
    [processQueue]
  );

  const stop = useCallback(() => {
    queueRef.current = [];
    playingRef.current = false;
    const audioElement = document.querySelector("audio");
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
  }, []);

  return {
    availableVoices,
    enabled,
    enqueue,
    language,
    loadingVoices,
    setEnabled,
    setLanguage,
    setVoice,
    setVolume,
    stop,
    voice,
    volume,
  };
}

"use client";

import { useEffect, useRef } from "react";
import { AVATAR_DEFAULTS, AVATAR_EVENTS } from "@/constants/avatar";
import {
  normalizeVolumePercent,
  readAvatarSettings,
  readAvatarThreshold,
  sendAvatarTalkingState,
} from "@/utils/avatar";

type TimerId = ReturnType<typeof setInterval>;

export interface AvatarStateDetail {
  volume: number;
  isTalking: boolean;
}

declare global {
  interface Window {
    currentVolume?: number;
    currentAvatarTalking?: boolean;
  }
}

function emitAvatarState(detail: AvatarStateDetail): void {
  window.currentVolume = detail.volume;
  window.currentAvatarTalking = detail.isTalking;
  window.dispatchEvent(
    new CustomEvent<AvatarStateDetail>(AVATAR_EVENTS.STATE_CHANGE, { detail })
  );
}

export function useAvatarAudioEngine(): void {
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<TimerId | null>(null);
  const silenceTimeoutRef = useRef<TimerId | null>(null);
  const talkingRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    const stopAudioEngine = async () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (audioContextRef.current) {
        await audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
    };

    const setTalking = (isTalking: boolean, volume: number) => {
      if (talkingRef.current === isTalking) {
        emitAvatarState({ volume, isTalking });
        return;
      }

      talkingRef.current = isTalking;
      sendAvatarTalkingState(isTalking);
      emitAvatarState({ volume, isTalking });
    };

    const startAudioEngine = async () => {
      await stopAudioEngine();
      if (disposed) return;

      try {
        const savedMic = readAvatarSettings().micId;
        const constraints: MediaStreamConstraints = savedMic
          ? { audio: { deviceId: { exact: savedMic } } }
          : { audio: true };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;

        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
        audioContextRef.current = audioContext;

        intervalRef.current = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);

          let total = 0;
          for (let i = 0; i < dataArray.length; i += 1) {
            total += dataArray[i];
          }

          const volume = normalizeVolumePercent(total / dataArray.length);
          const isOverThreshold = volume > readAvatarThreshold();

          if (isOverThreshold) {
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
              silenceTimeoutRef.current = null;
            }
            setTalking(true, volume);
            return;
          }

          if (talkingRef.current && !silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              silenceTimeoutRef.current = null;
              setTalking(false, volume);
            }, AVATAR_DEFAULTS.SILENCE_HOLD_MS);
            return;
          }

          emitAvatarState({ volume, isTalking: talkingRef.current });
        }, AVATAR_DEFAULTS.SAMPLE_INTERVAL_MS);
      } catch (err) {
        console.error("Error initializing audio engine:", err);
      }
    };

    const resumeAudioContext = () => {
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume().catch(() => undefined);
      }
    };

    startAudioEngine();

    window.addEventListener(AVATAR_EVENTS.RELOAD_MIC, startAudioEngine);
    document.addEventListener("visibilitychange", resumeAudioContext);

    return () => {
      disposed = true;
      window.removeEventListener(AVATAR_EVENTS.RELOAD_MIC, startAudioEngine);
      document.removeEventListener("visibilitychange", resumeAudioContext);
      void stopAudioEngine();
    };
  }, []);
}

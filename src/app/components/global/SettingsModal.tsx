"use client";

import { useEffect, useState } from "react";
import { readAvatarSettings, saveAvatarSettings } from "@/utils/avatar";
import { AVATAR_EVENTS } from "@/constants/avatar";
import { getAccent, saveAccent } from "@/utils/accent";
import {
  DevicesTab,
  TTSTab,
  ChatTab,
  AppearanceTab,
  ConnectionsTab,
} from "./settings";

export type TabId = "devices" | "tts" | "chat" | "appearance" | "connections";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabId;
  ttsEnabled: boolean;
  onTTSToggle: (v: boolean) => void;
  ttsLanguage: string;
  onLanguageChange: (v: string) => void;
  ttsVoice: string;
  onVoiceChange: (v: string) => void;
  availableVoices: string[];
  loadingVoices: boolean;
  ttsVolume: number;
  onVolumeChange: (v: number) => void;
  autoScroll: boolean;
  onAutoScrollToggle: (v: boolean) => void;
  commandVolume: number;
  onCommandVolumeChange: (v: number) => void;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "devices",
    label: "Dispositivos",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    id: "tts",
    label: "TTS",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
      </svg>
    ),
  },
  {
    id: "chat",
    label: "Chat",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "appearance",
    label: "Apariencia",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    id: "connections",
    label: "Conexiones",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
];

export default function SettingsModal({
  isOpen,
  onClose,
  initialTab,
  ttsEnabled,
  onTTSToggle,
  ttsLanguage,
  onLanguageChange,
  ttsVoice,
  onVoiceChange,
  availableVoices,
  loadingVoices,
  ttsVolume,
  onVolumeChange,
  autoScroll,
  onAutoScrollToggle,
  commandVolume,
  onCommandVolumeChange,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? "devices");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [micId, setMicId] = useState("");
  const [accentHex, setAccentHex] = useState(getAccent());

  useEffect(() => {
    if (isOpen && initialTab) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    setAccentHex(getAccent());
    const avatarSettings = readAvatarSettings();
    setMicId(avatarSettings.micId || "");

    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch {}
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter((d) => d.kind === "videoinput"));
        setMics(devices.filter((d) => d.kind === "audioinput"));
      } catch (e) {
        console.error("Error loading devices:", e);
      }
    };
    void loadDevices();
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const onReset = () => {
      setAccentHex(getAccent());
      onTTSToggle(false);
      onLanguageChange("es-ES");
      onVoiceChange("");
      onVolumeChange(100);
      onAutoScrollToggle(true);
      onCommandVolumeChange(80);
    };
    window.addEventListener("rawenchat-config-reset", onReset);
    return () => window.removeEventListener("rawenchat-config-reset", onReset);
  }, [onTTSToggle, onLanguageChange, onVoiceChange, onVolumeChange, onAutoScrollToggle, onCommandVolumeChange]);

  function handleCameraChange(id: string) {
    setCameraId(id);
  }

  function handleMicChange(id: string) {
    setMicId(id);
    const settings = readAvatarSettings();
    saveAvatarSettings({ ...settings, micId: id });
    window.dispatchEvent(new Event(AVATAR_EVENTS.RELOAD_MIC));
  }

  function handleAccentChange(hex: string) {
    setAccentHex(hex);
    saveAccent(hex);
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[10px] shadow-2xl overflow-hidden animate-scale-in flex"
        style={{ maxWidth: 680, height: "min(520px, 88vh)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="w-44 shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--surface)]">
          <div className="px-4 py-4 border-b border-[var(--border)]">
            <h2 className="text-[13px] font-semibold text-white tracking-tight">Configuración</h2>
          </div>

          <div className="flex-1 py-2 px-2 space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] transition-colors text-left ${
                  activeTab === tab.id
                    ? "bg-[var(--accent-muted)] text-white border border-[var(--accent-border)]"
                    : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--elevated)] border border-transparent"
                }`}
              >
                <span className={activeTab === tab.id ? "text-[var(--accent)]" : "opacity-60"}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="w-full text-[11px] text-[var(--text-muted)] hover:text-white transition-colors text-center py-1"
            >
              Esc para cerrar
            </button>
          </div>
        </nav>

        <div className="flex-1 min-w-0 overflow-y-auto rawen-scrollbar p-6">
          {activeTab === "devices" && (
            <DevicesTab
              cameras={cameras}
              mics={mics}
              cameraId={cameraId}
              micId={micId}
              onCameraChange={handleCameraChange}
              onMicChange={handleMicChange}
            />
          )}
          {activeTab === "tts" && (
            <TTSTab
              ttsEnabled={ttsEnabled}
              onTTSToggle={onTTSToggle}
              ttsLanguage={ttsLanguage}
              onLanguageChange={onLanguageChange}
              ttsVoice={ttsVoice}
              onVoiceChange={onVoiceChange}
              availableVoices={availableVoices}
              loadingVoices={loadingVoices}
              ttsVolume={ttsVolume}
              onVolumeChange={onVolumeChange}
            />
          )}
          {activeTab === "chat" && (
            <ChatTab
              autoScroll={autoScroll}
              onAutoScrollToggle={onAutoScrollToggle}
              commandVolume={commandVolume}
              onCommandVolumeChange={onCommandVolumeChange}
            />
          )}
          {activeTab === "appearance" && (
            <AppearanceTab accentHex={accentHex} onChange={handleAccentChange} />
          )}
          {activeTab === "connections" && <ConnectionsTab />}
        </div>
      </div>
    </div>
  );
}

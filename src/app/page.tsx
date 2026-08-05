"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./components/sidebar/Sidebar";
import SettingsModal, { type TabId as SettingsTabId } from "./components/global/SettingsModal";
import UpdateModal from "./components/global/UpdateModal";
import Toast from "./components/global/Toast";
import ConnectedHeader from "./components/home/ConnectedHeader";
import ConnectScreen from "./components/home/ConnectScreen";
import MainTabContent from "./components/home/MainTabContent";
import ControlBox from "./components/controlbox";
import OverlayEditorClient from "./overlay/OverlayEditorClient";
import {
  CameraStreamBridge,
  useAvatarAudioEngine,
  useChatConnection,
  useTtsSettings,
  useOverlayAlerts,
} from "@/hooks";
import { STORAGE_KEYS } from "@/constants/config";
import { getAssetById, notifyOverlaySessionChanged, readStoredOverlaySettings } from "@/utils/overlay";
import {
  DEFAULT_ALERT_TEMPLATES,
  OVERLAY_ALERT_EVENT,
  claimAlertTts,
  formatAlertTemplate,
  refreshAlertEngineConfig,
  sanitizeAlertData,
} from "@/utils/alerts";
import { TWITCH_AUTH_CHANGED_EVENT } from "@/utils/twitch";
import { getFromStorage, removeFromStorage, saveToStorage } from "@/utils/storage";
import type { ChatPlatform } from "@/utils/platform";
import type { OverlayAlert } from "@/types/overlay";
import type { Command } from "./components/sidebar/CommandsPanel";
import type { SidebarTab } from "./types/chat";

function IconSettings({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function loadCommands(): Command[] {
  return getFromStorage<Command[]>(STORAGE_KEYS.COMMANDS) || [];
}

export default function Home() {
  const [channelInput, setChannelInput] = useState("");
  const [channel, setChannel] = useState("");
  const [platform, setPlatform] = useState<ChatPlatform>("twitch");
  const [activeTab, setActiveTab] = useState<SidebarTab>("chat");
  const [commands, setCommandsState] = useState<Command[]>(loadCommands);
  const [toastMessage, setToastMessage] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [commandVolume, setCommandVolumeState] = useState<number>(() => {
    const saved = getFromStorage<number>(STORAGE_KEYS.COMMAND_VOLUME);
    return typeof saved === "number" ? saved : 80;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId | undefined>(undefined);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useAvatarAudioEngine();

  const tts = useTtsSettings();
  const ttsRef = useRef(tts);
  ttsRef.current = tts;

  useOverlayAlerts();

  useEffect(() => {
    const onOpenSettings = () => {
      setSettingsInitialTab("connections");
      setIsModalOpen(true);
    };
    window.addEventListener("rawenchat-open-settings", onOpenSettings);
    return () => window.removeEventListener("rawenchat-open-settings", onOpenSettings);
  }, []);

  useEffect(() => {
    const onAlert = (e: Event) => {
      const alert = (e as CustomEvent<OverlayAlert>).detail;
      if (!alert?.kind) return;
      if (!claimAlertTts(alert)) return;

      const settings = readStoredOverlaySettings();
      const alertScene = settings?.scenes.find((s) => s.widgets.some((x) => x.kind === "alert"));
      const alertWidget = alertScene?.widgets.find((w) => w.kind === "alert");
      if (!alertScene || !alertWidget || alertWidget.kind !== "alert") return;

      const alertData = sanitizeAlertData(alertWidget.data);
      if (!alertData.ttsEnabled) return;

      const template = alertData.templates[alert.kind] || DEFAULT_ALERT_TEMPLATES[alert.kind];
      const line = formatAlertTemplate(template, alert);

      if (alertData.ttsAfterSound && alertData.soundAssetId) {
        const sound = getAssetById(alertScene, alertData.soundAssetId);
        let spoken = false;
        const speak = () => {
          if (!spoken) {
            spoken = true;
            ttsRef.current.enqueue(line);
          }
        };

        if (sound) {
          const probe = new Audio(sound.src);
          const scheduleFromDuration = () => {
            const ms = Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration * 1000 : -1;
            if (ms < 0) return false;
            window.setTimeout(speak, ms + 300);
            return true;
          };

          probe.addEventListener("loadedmetadata", () => {
            if (!scheduleFromDuration()) {
              probe.addEventListener("durationchange", () => scheduleFromDuration(), { once: true });
            }
          });
          probe.addEventListener("error", speak);
          window.setTimeout(speak, 20_000);
        } else {
          speak();
        }
      } else {
        ttsRef.current.enqueue(line);
      }
    };

    window.addEventListener(OVERLAY_ALERT_EVENT, onAlert);
    return () => window.removeEventListener(OVERLAY_ALERT_EVENT, onAlert);
  }, []);

  useEffect(() => {
    void refreshAlertEngineConfig();
    const refresh = () => void refreshAlertEngineConfig();
    window.addEventListener(TWITCH_AUTH_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(TWITCH_AUTH_CHANGED_EVENT, refresh);
  }, [platform, channel]);

  const chat = useChatConnection({
    channel,
    commands,
    platform,
    commandVolume,
    onTtsMessage: tts.enqueue,
  });

  const handleCommandVolumeChange = useCallback((v: number) => {
    setCommandVolumeState(v);
    saveToStorage(STORAGE_KEYS.COMMAND_VOLUME, v);
  }, []);

  const setCommands = useCallback((updated: Command[]) => {
    setCommandsState(updated);
    saveToStorage(STORAGE_KEYS.COMMANDS, updated);
  }, []);

  const handleConnect = useCallback(() => {
    const nextChannel = channelInput.trim();
    if (!nextChannel) {
      alert("Por favor ingresa un nombre de canal válido.");
      return;
    }
    setChannel(nextChannel);
    saveToStorage(STORAGE_KEYS.LAST_CHANNEL, nextChannel);
    saveToStorage(STORAGE_KEYS.LAST_PLATFORM, platform);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.LAST_CHANNEL, newValue: nextChannel }));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.LAST_PLATFORM, newValue: platform }));
    notifyOverlaySessionChanged();
  }, [channelInput, platform]);

  const handleDisconnect = useCallback(() => {
    tts.stop();
    chat.disconnect();
    setChannel("");
    setChannelInput("");
    setActiveTab("chat");
    removeFromStorage(STORAGE_KEYS.LAST_CHANNEL);
    removeFromStorage(STORAGE_KEYS.LAST_PLATFORM);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.LAST_CHANNEL, newValue: null }));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.LAST_PLATFORM, newValue: null }));
    notifyOverlaySessionChanged();
  }, [chat, tts]);

  const handlePlatformChange = useCallback((nextPlatform: ChatPlatform) => {
    setPlatform(nextPlatform);
    saveToStorage(STORAGE_KEYS.LAST_PLATFORM, nextPlatform);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.LAST_PLATFORM, newValue: nextPlatform }));
    notifyOverlaySessionChanged();
  }, []);

  useEffect(() => {
    const savedChannel = getFromStorage<string>(STORAGE_KEYS.LAST_CHANNEL)?.trim();
    const savedPlatform = getFromStorage<ChatPlatform>(STORAGE_KEYS.LAST_PLATFORM);

    if (savedPlatform === "twitch" || savedPlatform === "kick") {
      setPlatform(savedPlatform);
    }
    if (savedChannel) {
      setChannelInput(savedChannel);
      setChannel(savedChannel);
    }
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!autoScroll) return;
    requestAnimationFrame(() => {
      const container = document.querySelector(".messages-container");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }, [chat.messages, autoScroll]);

  const handleUpdateAvailable = useCallback(() => {
    setIsUpdateModalOpen(true);
  }, []);

  return (
    <main
      className="flex h-screen bg-black select-none overflow-hidden"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <CameraStreamBridge />
      <Sidebar
        channel={channel}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setIsModalOpen={setIsModalOpen}
        setIsUpdateModalOpen={setIsUpdateModalOpen}
      />

      <div
        className="content-shell"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {channel || activeTab === "overlay" ? (
          <ConnectedHeader
            activeTab={activeTab}
            isConnected={chat.isConnected}
            channel={channel}
            platform={platform}
            TTS={tts.enabled}
            stopTTS={tts.stop}
            handleDisconnect={handleDisconnect}
            onPlatformChange={handlePlatformChange}
          />
        ) : (
          <div
            className="page-toolbar"
            style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
          >
            <div className="flex items-center gap-2.5" />
            <div
              className="toolbar-actions"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="toolbar-btn"
                title="Configuración"
              >
                <IconSettings className="w-4 h-4" />
              </button>
              <ControlBox />
            </div>
          </div>
        )}

        <div className="content-body">
          {activeTab === "overlay" ? (
            <OverlayEditorClient embedded />
          ) : !channel ? (
            <ConnectScreen
              channelInput={channelInput}
              inputRef={inputRef}
              platform={platform}
              onChannelInputChange={setChannelInput}
              onConnect={handleConnect}
              onOpenOverlay={() => setActiveTab("overlay")}
              onPlatformChange={handlePlatformChange}
            />
          ) : (
            <MainTabContent
              activeTab={activeTab}
              channel={channel}
              commands={commands}
              commandVolume={commandVolume}
              isConnected={chat.isConnected}
              messages={chat.messages}
              platform={platform}
              setCommands={setCommands}
              setToastMessage={setToastMessage}
            />
          )}
        </div>
      </div>

      <SettingsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSettingsInitialTab(undefined);
          window.dispatchEvent(new Event("rawenchat-connections-changed"));
        }}
        initialTab={settingsInitialTab}
        ttsEnabled={tts.enabled}
        onTTSToggle={tts.setEnabled}
        autoScroll={autoScroll}
        onAutoScrollToggle={setAutoScroll}
        commandVolume={commandVolume}
        onCommandVolumeChange={handleCommandVolumeChange}
        ttsLanguage={tts.language}
        onLanguageChange={tts.setLanguage}
        ttsVoice={tts.voice}
        onVoiceChange={tts.setVoice}
        availableVoices={tts.availableVoices}
        loadingVoices={tts.loadingVoices}
        ttsVolume={tts.volume}
        onVolumeChange={tts.setVolume}
      />

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onUpdateAvailable={handleUpdateAvailable}
      />

      {toastMessage && <Toast message={toastMessage} type="success" />}
    </main>
  );
}

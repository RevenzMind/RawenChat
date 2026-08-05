"use client";

import type { ClipboardEvent } from "react";
import type { MessageProps } from "../../types/chat";
import type { ChatPlatform } from "@/utils/platform";
import { useEffect, useRef, useState } from "react";
import { getFromStorage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";
import { useCustomMessageComponent } from "@/hooks";
import { TailwindRuntimeLoader } from "../shared/TailwindRuntimeLoader";

interface ChatPanelProps {
  channel: string;
  platform: ChatPlatform;
  messages: MessageProps[];
  setToastMessage: (msg: string) => void;
}

async function loadPersistedComponentCode(): Promise<string> {
  if (typeof window !== "undefined" && window.electron) {
    const saved = await window.electron.getObsComponent();
    return saved || "";
  }
  return getFromStorage<string>(STORAGE_KEYS.OBS_CSS) || "";
}

export default function ChatPanel({ channel, messages, setToastMessage }: ChatPanelProps) {
  const [componentCode, setComponentCode] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Marca con clase las filas que tienen selección activa (fondo redondeado)
  useEffect(() => {
    function onSelectionChange() {
      const container = containerRef.current;
      if (!container) return;
      const sel = window.getSelection();
      const active = !!sel && !sel.isCollapsed;
      container.querySelectorAll<HTMLElement>("[data-chat-msg]").forEach((el) => {
        const selected = active && sel.containsNode(el, true);
        el.classList.toggle("msg-selected", selected);
      });
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  // Copy custom: texto limpio al portapapeles + feedback, como app nativa
  const handleCopy = (e: ClipboardEvent<HTMLDivElement>) => {
    const raw = window.getSelection()?.toString().trim();
    if (!raw) return;
    e.preventDefault();
    const text = raw.replace(/\n{3,}/g, "\n\n");
    e.clipboardData.setData("text/plain", text);
    setToastMessage("Texto copiado");
  };

  useEffect(() => {
    loadPersistedComponentCode().then(setComponentCode);
  }, []);

  // Reload component code when the settings modal saves a new style
  useEffect(() => {
    function onStorageUpdate(e: StorageEvent) {
      if (e.key === STORAGE_KEYS.OBS_CSS && e.newValue !== null) {
        setComponentCode(e.newValue);
      }
    }
    window.addEventListener("storage", onStorageUpdate);
    return () => window.removeEventListener("storage", onStorageUpdate);
  }, []);

  const LiveMessageComponent = useCustomMessageComponent(componentCode);

  return (
    <>
      <TailwindRuntimeLoader />
      <div className="flex-1 flex flex-col min-h-0 animate-tab-enter">
        <div className="relative flex-1 min-h-0">
          <div
            ref={containerRef}
            className="messages-container chat-selectable absolute inset-0 overflow-y-auto rawen-scrollbar px-4 py-4"
            onCopy={handleCopy}
          >
            {messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={`${msg.timestamp}-${msg.username}`}
                  data-chat-msg
                  className="rounded-lg transition-colors duration-100"
                >
                  <LiveMessageComponent msg={msg} ShowTime={true} />
                </div>
              ))
            ) : (
              <EmptyMessagesState channel={channel} />
            )}
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[var(--background)] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[var(--background)] to-transparent" />
        </div>
      </div>
    </>
  );
}

function EmptyMessagesState({ channel }: { channel: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-75">
      <div className="flex flex-col items-center gap-4 text-center animate-scale-in">
        <div className="w-12 h-12 rounded-md bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center">
          <svg
            className="w-5 h-5 text-[var(--accent)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Sin mensajes aún</h3>
          <p className="text-[var(--text-secondary)] text-xs max-w-xs">
            Esperando actividad en{" "}
            <span className="text-[var(--accent)] font-medium">{channel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse-dot" />
          <span className="text-[var(--text-muted)] text-xs">Escuchando...</span>
        </div>
      </div>
    </div>
  );
}

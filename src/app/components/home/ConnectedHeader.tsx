"use client";

import ControlBox from "../controlbox";
import type { SidebarTab } from "../../types/chat";
import type { ChatPlatform } from "@/utils/platform";

interface ConnectedHeaderProps {
  activeTab: SidebarTab;
  isConnected: boolean;
  channel: string;
  platform: ChatPlatform;
  TTS: boolean;
  stopTTS: () => void;
  handleDisconnect: () => void;
  onPlatformChange?: (platform: ChatPlatform) => void;
}

const PLATFORM_META: Record<ChatPlatform, { label: string; color: string }> = {
  twitch: { label: "Twitch", color: "#a970ff" },
  kick: { label: "Kick", color: "#53fc18" },
};

function iconAttrs(className = "h-4 w-4") {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconTerminal({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLayers({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconStop({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const TAB_META: Record<SidebarTab, { icon: (p: { className?: string }) => React.ReactElement; label: string; desc: string }> = {
  chat: { icon: IconChat, label: "Chat", desc: "Mensajes en tiempo real del canal" },
  commands: { icon: IconTerminal, label: "Comandos", desc: "Automatiza acciones con comandos del chat" },
  avatar: { icon: IconUser, label: "Avatar", desc: "Configura tu overlay reactivo para OBS" },
  overlay: { icon: IconLayers, label: "Editor de overlays", desc: "Diseña y publica tu HUD para OBS" },
};

export default function ConnectedHeader({
  activeTab,
  isConnected,
  channel,
  platform,
  TTS,
  stopTTS,
  handleDisconnect,
  onPlatformChange,
}: ConnectedHeaderProps) {
  const { icon: Icon, label, desc } = TAB_META[activeTab];

  return (
    <>
      <div
        className="page-toolbar"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[13px] font-semibold text-white leading-tight truncate">{label}</h1>
            <p className="text-[11px] text-[var(--text-muted)] leading-tight truncate">{desc}</p>
          </div>
        </div>

        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {channel && (
            <div className="hidden sm:flex h-8 items-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card)]">
              {(Object.keys(PLATFORM_META) as ChatPlatform[]).map((p) => {
                const active = p === platform;
                const meta = PLATFORM_META[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => !active && onPlatformChange?.(p)}
                    title={`Cambiar a ${meta.label}`}
                    className={`flex h-full items-center gap-1.5 px-2.5 text-[11px] font-semibold transition-colors ${
                      active ? "" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                    style={
                      active
                        ? { color: meta.color, background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }
                        : undefined
                    }
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: active && isConnected ? meta.color : "var(--border)",
                        boxShadow: active && isConnected ? `0 0 6px ${meta.color}` : undefined,
                      }}
                    />
                    {meta.label}
                  </button>
                );
              })}
              <div className="h-4 w-px bg-[var(--border)]" />
              <span className="flex items-center gap-1.5 px-2.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-[var(--success)] animate-pulse-dot" : "bg-[var(--error)]"}`}
                />
                <span className="text-[11px] font-semibold text-white">{channel}</span>
              </span>
            </div>
          )}

          <div className="toolbar-actions">
            {channel && TTS && (
              <button
                onClick={stopTTS}
                className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(248,113,113,0.35)] hover:bg-[var(--error-muted)] hover:text-[var(--error)]"
                title="Pausar TTS"
              >
                <IconStop className="h-3 w-3" />
                Pausar TTS
              </button>
            )}
            {channel && (
              <button
                onClick={handleDisconnect}
                className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(248,113,113,0.35)] hover:bg-[var(--error-muted)] hover:text-[var(--error)]"
                title="Desconectar"
              >
                <IconLogout className="h-3.5 w-3.5" />
                Desconectar
              </button>
            )}
          </div>

          <div className="w-px h-5 bg-[var(--border)] mx-1" />
          <ControlBox />
        </div>
      </div>

      {channel && (
        <div className="connection-bar">
          <div
            className={`connection-bar-fill ${isConnected ? "w-full bg-[var(--accent)]" : "w-1/4 bg-[var(--error)]"}`}
          />
        </div>
      )}
    </>
  );
}

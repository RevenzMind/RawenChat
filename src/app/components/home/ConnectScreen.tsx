"use client";

import { RefObject } from "react";
import { getPlatformDisplayName, type ChatPlatform } from "@/utils/platform";

interface ConnectScreenProps {
  channelInput: string;
  inputRef: RefObject<HTMLInputElement | null>;
  platform: ChatPlatform;
  onChannelInputChange: (value: string) => void;
  onConnect: () => void;
  onOpenOverlay: () => void;
  onPlatformChange: (platform: ChatPlatform) => void;
}

const FEATURES = [
  { emoji: "💬", label: "Chat en vivo" },
  { emoji: "🔊", label: "Text-to-Speech" },
  { emoji: "⌨️", label: "Comandos custom" },
  { emoji: "🎭", label: "Avatar OBS" },
];

export default function ConnectScreen({
  channelInput,
  inputRef,
  platform,
  onChannelInputChange,
  onConnect,
  onOpenOverlay,
  onPlatformChange,
}: ConnectScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 lg:p-10 animate-fade-in">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {}
        <div className="animate-slide-up">
          <div className="w-16 h-16 bg-[var(--accent)] rounded-2xl flex items-center justify-center mb-6">
            <img src="/logo.png" alt="RawenChat" className="w-9 h-9" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
            Tu chat de streaming,<br />
            <span className="text-[var(--accent)]">en un solo lugar</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-8 max-w-sm">
            Conecta tu canal de Twitch o Kick para ver mensajes, activar TTS,
            ejecutar comandos y configurar overlays para OBS.
          </p>
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((f) => (
              <span key={f.label} className="feature-chip">
                <span>{f.emoji}</span>
                {f.label}
              </span>
            ))}
          </div>
        </div>

        {}
        <div className="amoled-card p-7 animate-scale-in">
          <h3 className="text-lg font-bold text-white mb-1">Conectar canal</h3>
          <p className="text-[var(--text-muted)] text-xs mb-6">
            Elige tu plataforma e ingresa el nombre del canal
          </p>

          <div className="space-y-5">
            <div>
              <span className="block text-xs text-[var(--text-secondary)] mb-2.5 font-medium">
                Plataforma
              </span>
              <div className="flex gap-2">
                {(["twitch", "kick"] as ChatPlatform[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPlatformChange(p)}
                    className={`platform-chip flex-1 justify-center ${platform === p ? "platform-chip-active" : ""}`}
                  >
                    {getPlatformDisplayName(p)}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="block text-xs text-[var(--text-secondary)] mb-2 font-medium">
                Nombre del canal
              </span>
              <input
                type="text"
                ref={inputRef}
                value={channelInput}
                onChange={(event) => onChannelInputChange(event.target.value)}
                placeholder="ej. rawencat"
                className="amoled-input"
                onKeyDown={(event) => event.key === "Enter" && onConnect()}
              />
            </label>

            <button
              onClick={onConnect}
              disabled={!channelInput.trim()}
              className="amoled-button w-full py-3"
            >
              Conectar a {getPlatformDisplayName(platform)}
            </button>

            <button
              type="button"
              onClick={onOpenOverlay}
              className="amoled-button-ghost w-full py-3"
            >
              Abrir editor de overlays
            </button>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors pt-2"
            >
              Ver en GitHub →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

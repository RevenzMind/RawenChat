"use client";

import Dropdown from "../Dropdown";
import { Toggle } from "@/app/components/ui";
import { Field, SectionTitle } from "./DevicesTab";

interface TTSTabProps {
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
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-lg border border-[var(--border)] bg-[var(--card)] cursor-pointer select-none hover:border-[var(--accent-border)] transition-colors"
      onClick={() => onChange(!checked)}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{label}</div>
        {description && (
          <div className="text-[12px] text-[var(--text-muted)] mt-0.5">{description}</div>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

const TTS_LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Español (España)" },
  { value: "es-MX", label: "Español (México)" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
  { value: "it-IT", label: "Italiano" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "ja-JP", label: "日本語" },
  { value: "zh-CN", label: "中文 (简体)" },
];

export function TTSTab({
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
}: TTSTabProps) {
  return (
    <div className="space-y-5">
      <SectionTitle>Text to Speech</SectionTitle>
      <ToggleRow
        label="Activar TTS"
        description="Lee los mensajes del chat en voz alta"
        checked={ttsEnabled}
        onChange={onTTSToggle}
      />
      {ttsEnabled && (
        <div className="space-y-4 pt-1">
          <Field label="Idioma">
            <Dropdown
              options={TTS_LANGUAGES}
              value={ttsLanguage}
              onChange={onLanguageChange}
              placeholder="Seleccionar idioma"
            />
          </Field>
          <Field label="Voz">
            <Dropdown
              options={availableVoices.map((v) => ({ value: v, label: v }))}
              value={ttsVoice}
              onChange={onVoiceChange}
              placeholder={loadingVoices ? "Cargando voces..." : "Seleccionar voz"}
              className={loadingVoices || !availableVoices.length ? "opacity-40 pointer-events-none" : ""}
            />
          </Field>
          <Field label={`Volumen — ${Math.round(ttsVolume)}%`}>
            <input
              type="range"
              min={0}
              max={100}
              value={ttsVolume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-full accent-[var(--accent)] cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--accent) ${ttsVolume}%, var(--elevated) ${ttsVolume}%)`,
              }}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

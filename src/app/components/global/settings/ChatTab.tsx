"use client";

import { Field, SectionTitle } from "./DevicesTab";
import { ToggleRow } from "./TTSTab";

interface ChatTabProps {
  autoScroll: boolean;
  onAutoScrollToggle: (v: boolean) => void;
  commandVolume: number;
  onCommandVolumeChange: (v: number) => void;
}

export function ChatTab({
  autoScroll,
  onAutoScrollToggle,
  commandVolume,
  onCommandVolumeChange,
}: ChatTabProps) {
  return (
    <div className="space-y-5">
      <SectionTitle>Chat</SectionTitle>
      <ToggleRow
        label="Auto scroll"
        description="Sigue automáticamente los mensajes nuevos"
        checked={autoScroll}
        onChange={onAutoScrollToggle}
      />
      <Field label={`Volumen de comandos — ${Math.round(commandVolume)}%`}>
        <input
          type="range"
          min={0}
          max={100}
          value={commandVolume}
          onChange={(e) => onCommandVolumeChange(Number(e.target.value))}
          className="w-full accent-[var(--accent)] cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent) ${commandVolume}%, var(--elevated) ${commandVolume}%)`,
          }}
        />
      </Field>
    </div>
  );
}

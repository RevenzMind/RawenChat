"use client";

import { useState, useRef, useCallback } from "react";
import { isValidKey } from "@/constants/validation";
import { DEFAULTS } from "@/constants/config";
import { getPlatformDisplayName, type ChatPlatform } from "@/utils/platform";
import {
  ActionGlyph,
  ClockIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  TerminalIcon,
  TrashIcon,
  VolumeIcon,
  XIcon,
  commandIdentity,
  CommandCard,
} from "./commands";

export interface Command {
  id: string;
  name: string;
  trigger: string;
  key: string;
  timeout?: number;
  actionType?: "key" | "sound" | "both";
  soundFile?: string;
  rateLimitType?: "global" | "per-user";
}

interface CommandsPanelProps {
  commands: Command[];
  setCommands: (commands: Command[]) => void;
  commandVolume: number;
  isLocked?: boolean;
  platform?: ChatPlatform;
}

const EMPTY_COMMAND: Omit<Command, "id"> = {
  name: "",
  trigger: "",
  key: "",
  timeout: DEFAULTS.COMMAND_TIMEOUT_MS,
  actionType: DEFAULTS.COMMAND_ACTION_TYPE,
  soundFile: "",
  rateLimitType: "per-user",
};

const ACTION_TYPES: { value: "key" | "sound" | "both"; label: string; hint: string }[] = [
  { value: "key", label: "Tecla", hint: "Presiona una tecla" },
  { value: "sound", label: "Sonido", hint: "Reproduce un audio" },
  { value: "both", label: "Ambos", hint: "Tecla y audio" },
];

const inputCls =
  "h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-[var(--accent-border)] focus:bg-white/[0.05] focus:ring-2 focus:ring-[var(--accent-muted)]";

const btnPrimary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[#1c1108] transition hover:brightness-110 disabled:pointer-events-none disabled:opacity-40";

const btnGhost =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100";

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[13px] font-medium text-zinc-200">{children}</span>
      {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <span className="block mt-1.5 text-xs text-red-400">{children}</span>;
}

export default function CommandsPanel({
  commands,
  setCommands,
  commandVolume,
  isLocked = false,
  platform = "twitch",
}: CommandsPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Command | null>(null);
  const [form, setForm] = useState<Omit<Command, "id">>(EMPTY_COMMAND);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(0);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(5);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const actionType = form.actionType || "key";

  const startAdd = useCallback(() => {
    setEditing({ id: "", ...EMPTY_COMMAND });
    setForm(EMPTY_COMMAND);
    setTimeoutMinutes(0);
    setTimeoutSeconds(Math.floor((DEFAULTS.COMMAND_TIMEOUT_MS % 60000) / 1000));
    setSelectedFileName("");
    setAudioBlob(null);
    setErrors({});
    setIsModalOpen(true);
  }, []);

  const startEdit = useCallback((cmd: Command) => {
    const totalMs = cmd.timeout || DEFAULTS.COMMAND_TIMEOUT_MS;
    const mins = Math.floor(totalMs / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    setEditing(cmd);
    setForm({
      name: cmd.name,
      trigger: cmd.trigger,
      key: cmd.key,
      timeout: cmd.timeout,
      actionType: cmd.actionType,
      soundFile: cmd.soundFile,
      rateLimitType: cmd.rateLimitType || "per-user",
    });
    setTimeoutMinutes(mins);
    setTimeoutSeconds(Math.floor(secs));
    setSelectedFileName(cmd.soundFile ? "[Audio guardado]" : "");
    setAudioBlob(null);
    setErrors({});
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditing(null);
    setSelectedFileName("");
    setAudioBlob(null);
    setErrors({});
  }, []);

  const handleTestSound = useCallback((soundFile?: string) => {
    if (!soundFile) return;
    try {
      const audio = new Audio(soundFile.startsWith("data:") ? soundFile : `/${soundFile}`);
      audio.volume = commandVolume / 100;
      audio.play().catch(console.error);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }, [commandVolume]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "El nombre es requerido.";
    if (!form.trigger.trim()) {
      errs.trigger = "El comando es requerido.";
    } else if (!form.trigger.trim().startsWith("!")) {
      errs.trigger = "El comando debe empezar con !";
    }
    if (actionType === "key" || actionType === "both") {
      if (!form.key.trim()) {
        errs.key = "La tecla es requerida.";
      } else if (!isValidKey(form.key)) {
        errs.key = "Tecla inválida. Usa letras, números o: space, enter, escape, f1-f12, arrows";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function getNextId(): string {
    if (commands.length === 0) return "1";
    const maxId = Math.max(...commands.map((c) => parseInt(c.id) || 0));
    return String(maxId + 1);
  }

  function save() {
    if (!validate()) return;
    const totalTimeoutMs = timeoutMinutes * 60000 + timeoutSeconds * 1000;
    const normalizedKey =
      actionType === "key" || actionType === "both" ? form.key.trim().toLowerCase() : "";

    if (audioBlob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const updated = editing?.id
          ? commands.map((c) =>
              c.id === editing.id
                ? {
                    ...c,
                    ...form,
                    soundFile: dataUrl,
                    timeout: totalTimeoutMs,
                    trigger: form.trigger.trim().toLowerCase(),
                    key: normalizedKey,
                    rateLimitType: form.rateLimitType || "per-user",
                  }
                : c
            )
          : [
              ...commands,
              {
                id: getNextId(),
                ...form,
                soundFile: dataUrl,
                timeout: totalTimeoutMs,
                trigger: form.trigger.trim().toLowerCase(),
                key: normalizedKey,
                rateLimitType: form.rateLimitType || "per-user",
              },
            ];
        setCommands(updated);
        closeModal();
      };
      reader.readAsDataURL(audioBlob);
      return;
    }

    const updated = editing?.id
      ? commands.map((c) =>
          c.id === editing.id
            ? {
                ...c,
                ...form,
                soundFile: form.soundFile || "",
                timeout: totalTimeoutMs,
                trigger: form.trigger.trim().toLowerCase(),
                key: normalizedKey,
                rateLimitType: form.rateLimitType || "per-user",
              }
            : c
        )
      : [
          ...commands,
          {
            id: getNextId(),
            ...form,
            soundFile: form.soundFile || "",
            timeout: totalTimeoutMs,
            trigger: form.trigger.trim().toLowerCase(),
            key: normalizedKey,
            rateLimitType: form.rateLimitType || "per-user",
          },
        ];
    setCommands(updated);
    closeModal();
  }

  const remove = useCallback(
    (id: string) => {
      setCommands(commands.filter((c) => c.id !== id));
    },
    [commands, setCommands]
  );

  function playAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    let audioSrc = "";
    if (audioBlob) {
      audioSrc = URL.createObjectURL(audioBlob);
    } else if (form.soundFile) {
      audioSrc = form.soundFile;
    }

    if (audioSrc) {
      audioRef.current = new Audio(audioSrc);
      audioRef.current.volume = commandVolume / 100;
      audioRef.current.play().catch((err) => console.error("Error playing audio:", err));
    }
  }

  function clearAudio() {
    setAudioBlob(null);
    setSelectedFileName("");
    if (form.soundFile) {
      setForm({ ...form, soundFile: "" });
    }
  }

  return (
    <>
      <div className="h-full overflow-y-auto rawen-scrollbar px-6 py-6">
        <div className="mx-auto max-w-3xl flex flex-col gap-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-100">Comandos</h2>
              <p className="mt-1 text-[13px] text-zinc-500">
                {isLocked
                  ? "Conecta un canal para crear comandos."
                  : `Acciones automáticas cuando alguien escribe un comando en ${getPlatformDisplayName(platform)}.`}
              </p>
            </div>
            <button
              type="button"
              onClick={startAdd}
              disabled={isLocked}
              className={`${btnPrimary} shrink-0`}
            >
              <PlusIcon className="h-4 w-4" />
              Nuevo
            </button>
          </div>

          {commands.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 px-6 py-16 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent)]">
                <TerminalIcon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-300">Todavía no hay comandos</p>
              <p className="mt-1 text-[13px] text-zinc-500">
                Crea el primero para automatizar tu stream.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {commands.map((cmd) => (
                <CommandCard
                  key={cmd.id}
                  cmd={cmd}
                  onEdit={startEdit}
                  onDelete={remove}
                  onTestSound={handleTestSound}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[var(--card)] shadow-2xl">
            <div className="flex items-start justify-between px-6 pt-5 pb-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">
                  {editing?.id ? "Editar comando" : "Nuevo comando"}
                </h3>
                <p className="mt-1 text-[13px] text-zinc-500">
                  Se ejecuta cuando alguien escribe el comando en el chat.
                </p>
              </div>
              <button
                type="button"
                title="Cerrar"
                aria-label="Cerrar"
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-100"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto rawen-scrollbar border-t border-white/10 px-6 py-6">
              <div className="flex flex-col gap-7">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel>Nombre</FieldLabel>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ej: Drop Gun"
                      className={inputCls}
                    />
                    {errors.name && <FieldError>{errors.name}</FieldError>}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel hint="Empieza con !">Comando del chat</FieldLabel>
                    <input
                      type="text"
                      value={form.trigger}
                      onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                      placeholder="!dropgun"
                      className={`${inputCls} font-mono`}
                    />
                    {errors.trigger && <FieldError>{errors.trigger}</FieldError>}
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel>Acción</FieldLabel>
                  <div className="grid grid-cols-3 gap-2.5">
                    {ACTION_TYPES.map(({ value, label, hint }) => {
                      const selected = form.actionType === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setForm({
                              ...form,
                              actionType: value,
                              key: value === "sound" ? "" : form.key,
                            });
                            if (value === "sound") {
                              setErrors((current) => {
                                const nextErrors = { ...current };
                                delete nextErrors.key;
                                return nextErrors;
                              });
                            }
                          }}
                          className={`rounded-lg border p-3.5 text-left transition-colors ${
                            selected
                              ? "border-[var(--accent-border)] bg-[var(--accent-muted)]"
                              : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                          }`}
                        >
                          <span
                            className={`flex items-center gap-2 text-[13px] font-medium ${
                              selected ? "text-[var(--accent)]" : "text-zinc-300"
                            }`}
                          >
                            <ActionGlyph type={value} className="h-4 w-4" />
                            {label}
                          </span>
                          <span className="mt-1 block text-[11px] text-zinc-500">{hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(actionType === "key" || actionType === "both") && (
                  <div className="space-y-2">
                    <FieldLabel hint="Letras, números, space, f1-f12, arrows">
                      Tecla a presionar
                    </FieldLabel>
                    <input
                      type="text"
                      value={form.key}
                      onChange={(e) => setForm({ ...form, key: e.target.value })}
                      placeholder="Ej: g"
                      maxLength={20}
                      className={`${inputCls} max-w-[200px] font-mono`}
                    />
                    {errors.key && <FieldError>{errors.key}</FieldError>}
                  </div>
                )}

                {(actionType === "sound" || actionType === "both") && (
                  <div className="space-y-2">
                    <FieldLabel>Archivo de audio</FieldLabel>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".mp3,.wav,.ogg,.m4a,audio/*"
                        title="Selecciona un archivo de audio"
                        onChange={(e) => {
                          const file = e.currentTarget.files?.[0];
                          if (file) {
                            setAudioBlob(file);
                            setSelectedFileName(file.name);
                          }
                        }}
                        className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
                      />
                      <div className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 text-sm text-zinc-400 transition-colors hover:border-[var(--accent-border)] hover:bg-white/[0.05]">
                        <VolumeIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span className="flex-1 truncate">
                          {selectedFileName || "Selecciona un archivo..."}
                        </span>
                        <span className="shrink-0 text-[11px] font-medium text-zinc-500">
                          Examinar
                        </span>
                      </div>
                    </div>

                    {(audioBlob || form.soundFile) && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={playAudio}
                          className={`${btnPrimary} !h-8 !px-3 text-xs`}
                        >
                          <PlayIcon className="h-3.5 w-3.5" />
                          Reproducir
                        </button>
                        <button
                          type="button"
                          onClick={clearAudio}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel hint="Entre activaciones">Cooldown</FieldLabel>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={timeoutMinutes}
                          onChange={(e) =>
                            setTimeoutMinutes(Math.max(0, parseInt(e.target.value) || 0))
                          }
                          className={`${inputCls} pr-10 text-center font-mono`}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase text-zinc-600">
                          min
                        </span>
                      </div>
                      <span className="font-medium text-zinc-600">:</span>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={timeoutSeconds}
                          onChange={(e) =>
                            setTimeoutSeconds(
                              Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                            )
                          }
                          className={`${inputCls} pr-10 text-center font-mono`}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase text-zinc-600">
                          seg
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel hint="Quién comparte el cooldown">Rate limit</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { value: "per-user", label: "Por usuario" },
                          { value: "global", label: "Global" },
                        ] as const
                      ).map(({ value, label }) => {
                        const selected = (form.rateLimitType || "per-user") === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setForm({ ...form, rateLimitType: value })}
                            className={`h-10 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                              selected
                                ? "border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent)]"
                                : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 px-6 py-4">
              <button type="button" onClick={closeModal} className={btnGhost}>
                Cancelar
              </button>
              <button type="button" onClick={save} className={btnPrimary}>
                {editing?.id ? "Guardar cambios" : "Crear comando"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

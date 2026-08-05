"use client";

import type { Command } from "../CommandsPanel";
import {
  ActionGlyph,
  ClockIcon,
  PencilIcon,
  PlayIcon,
  TrashIcon,
  commandIdentity,
} from "./CommandIcons";

interface CommandCardProps {
  cmd: Command;
  onEdit: (cmd: Command) => void;
  onDelete: (id: string) => void;
  onTestSound: (soundFile?: string) => void;
}

export function CommandCard({ cmd, onEdit, onDelete, onTestSound }: CommandCardProps) {
  const { Icon, color } = commandIdentity(cmd);
  const actionType = cmd.actionType || "key";
  const hasSound = (actionType === "sound" || actionType === "both") && cmd.soundFile;

  return (
    <div
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all duration-200 hover:border-[var(--accent-border)] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-black/40"
      style={{ minHeight: "135px" }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.07] transition-opacity group-hover:opacity-[0.15]"
        style={{ background: color, filter: "blur(16px)" }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 select-none"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-100">{cmd.name}</h3>
            <span className="font-mono text-[12px] font-medium text-[var(--accent)]">
              {cmd.trigger}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {hasSound && (
            <button
              type="button"
              onClick={() => onTestSound(cmd.soundFile)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 hover:bg-[var(--accent)] hover:text-[#1c1108] transition-colors"
              title="Probar sonido"
            >
              <PlayIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(cmd)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            title="Editar comando"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(cmd.id)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            title="Eliminar comando"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <ActionGlyph type={actionType} className="h-3.5 w-3.5 text-zinc-400" />
          {(actionType === "key" || actionType === "both") && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-medium text-zinc-200">
              {cmd.key}
            </span>
          )}
        </div>

        {cmd.timeout ? (
          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <ClockIcon className="h-3 w-3" />
            <span>{Math.round(cmd.timeout / 1000)}s</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

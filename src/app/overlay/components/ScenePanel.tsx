"use client";

import { useState } from "react";
import type { OverlaySceneConfig } from "@/types/overlay";
import { IconPencil, IconCopy, IconX, IconPlus } from "./icons";
import { Btn } from "./ui-primitives";

export function ScenePanel({
  scenes,
  activeSceneId,
  onSwitch,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
}: {
  scenes: OverlaySceneConfig[];
  activeSceneId: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => string | null;
  onRename: (id: string, name: string) => string | null;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");
  const [newName, setNewName] = useState("");
  const [newNameError, setNewNameError] = useState("");
  const [creating, setCreating] = useState(false);

  function commitRename(id: string) {
    if (!draft.trim()) { setDraftError("El nombre no puede estar vacío."); return; }
    const err = onRename(id, draft.trim());
    if (err) { setDraftError(err); return; }
    setEditingId(null);
    setDraftError("");
  }

  function commitCreate() {
    const name = newName.trim() || "New Scene";
    const err = onCreate(name);
    if (err) { setNewNameError(err); return; }
    setCreating(false);
    setNewName("");
    setNewNameError("");
  }

  return (
    <div className="space-y-1">
      {scenes.map((s) => (
        <div
          key={s.id}
          className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer border transition-colors ${
            s.id === activeSceneId
              ? "border-[var(--accent-border)] bg-[var(--accent-muted)]"
              : "border-transparent hover:border-[var(--border)] hover:bg-[var(--elevated)]"
          }`}
          onClick={() => { if (editingId !== s.id) onSwitch(s.id); }}
        >
          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.id === activeSceneId ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />
          {editingId === s.id ? (
            <div className="flex-1 min-w-0 space-y-0.5" onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                className={`amoled-input !py-0.5 !px-1.5 text-xs w-full ${draftError ? "border-red-500/50" : ""}`}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setDraftError(""); }}
                onBlur={() => commitRename(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(s.id);
                  if (e.key === "Escape") { setEditingId(null); setDraftError(""); }
                }}
              />
              {draftError && (
                <div className="text-[10px] text-red-400 leading-tight px-0.5">{draftError}</div>
              )}
            </div>
          ) : (
            <span
              className="flex-1 min-w-0 truncate text-xs"
              onDoubleClick={(e) => { e.stopPropagation(); setEditingId(s.id); setDraft(s.name); setDraftError(""); }}
            >
              {s.name}
            </span>
          )}
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--elevated)] transition-colors"
              title="Renombrar"
              onClick={() => { setEditingId(s.id); setDraft(s.name); setDraftError(""); }}
            >
              <IconPencil className="h-3 w-3" />
            </button>
            <button
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--elevated)] transition-colors"
              title="Duplicar"
              onClick={() => onDuplicate(s.id)}
            >
              <IconCopy className="h-3 w-3" />
            </button>
            {scenes.length > 1 && (
              <button
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-300 hover:bg-[var(--elevated)] transition-colors"
                title="Eliminar"
                onClick={() => onDelete(s.id)}
              >
                <IconX className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Inline create row */}
      {creating ? (
        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            className={`amoled-input !py-1 text-xs w-full ${newNameError ? "border-red-500/50" : ""}`}
            placeholder="Nombre de escena"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setNewNameError(""); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); setNewNameError(""); }
            }}
          />
          {newNameError && (
            <div className="text-[10px] text-red-400 leading-tight px-0.5">{newNameError}</div>
          )}
          <div className="flex gap-1.5">
            <Btn full accent onClick={commitCreate}>Crear</Btn>
            <Btn full onClick={() => { setCreating(false); setNewName(""); setNewNameError(""); }}>Cancelar</Btn>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-border)] transition-colors text-xs"
        >
          <IconPlus className="h-3 w-3 text-[var(--accent)]" />
          <span>Nueva escena</span>
        </button>
      )}
    </div>
  );
}

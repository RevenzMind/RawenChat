"use client";

import { useEffect } from "react";
import { Button } from "./Button";

// Diálogo de confirmación para acciones destructivas (reset, borrados)
export function ConfirmDialog({ title, message, confirmLabel = "Confirmar", danger = true, onConfirm, onCancel }: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={onCancel}>
      <div className="w-[400px] max-w-[92vw] rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className="text-sm font-semibold text-white">{title}</div>
        </div>
        <div className="px-4 py-3 text-[11px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
          {message}
        </div>
        <div className="px-4 py-3 border-t border-[var(--border)] flex justify-end gap-1.5">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button type="button" variant="accent" size="sm" danger={danger} onClick={() => { onConfirm(); onCancel(); }}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

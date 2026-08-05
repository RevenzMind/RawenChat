"use client";

import { useState } from "react";
import type { OverlaySceneConfig } from "@/types/overlay";
import { getOverlayLiveUrl } from "@/utils/overlay";
import { Btn } from "./ui-primitives";
import { IconX } from "./icons";

/** Popup con los pasos para montar el overlay en OBS */
export function HowToObsModal({
  scene,
  onClose,
}: {
  scene: OverlaySceneConfig;
  onClose: () => void;
}) {
  const url = getOverlayLiveUrl(scene);
  const [copied, setCopied] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-[440px] max-w-[92vw] rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="text-sm font-semibold text-white">Cómo usarlo en OBS</div>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-4 py-3 space-y-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
          <ol className="space-y-2 list-decimal list-inside">
            <li>En OBS ve a <strong className="text-white">Fuentes → + → Navegador</strong> (Browser Source).</li>
            <li>Pega la URL de esta escena:
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex-1 min-w-0 truncate font-mono text-[10px] px-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--text-muted)]">
                  {url}
                </div>
                <Btn accent onClick={() => {
                  void navigator.clipboard.writeText(url);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}>
                  {copied ? "¡Copiada!" : "Copiar"}
                </Btn>
              </div>
            </li>
            <li>Pon la resolución igual a la del lienzo: <strong className="text-white">{scene.width} × {scene.height}</strong> (ancho y alto del Browser Source, idealmente la misma que tu lienzo de OBS).</li>
            <li>El fondo es transparente: el overlay se integra directo sobre tu stream.</li>
          </ol>
          <p className="text-[10px] text-[var(--text-muted)]">
            La URL es por escena: si cambias de escena en el editor, actualiza la URL de la fuente (o crea una fuente por escena).
          </p>
        </div>
        <div className="px-4 py-3 border-t border-[var(--border)] flex justify-end">
          <Btn onClick={onClose}>Cerrar</Btn>
        </div>
      </div>
    </div>
  );
}

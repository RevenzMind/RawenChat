"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { OverlayWidget } from "@/types/overlay";
import { DEFAULT_CUSTOM_WIDGET_CODE } from "@/constants/overlay";
import { useCustomRenderableComponent, DEFAULT_COMPONENT_CODE } from "@/hooks";
import { IconX } from "./icons";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function CustomWidgetEditorModal({
  widget,
  onSave,
  onClose,
  starterCode,
}: {
  widget: Extract<OverlayWidget, { kind: "custom" }>;
  onSave: (code: string, propsJson: string) => void;
  onClose: () => void;
  starterCode?: string;
}) {
  const [code, setCode] = useState(widget.data.componentCode);
  const [propsJson, setPropsJson] = useState(widget.data.propsJson);
  const [propsError, setPropsError] = useState(false);

  const CustomComponent = useCustomRenderableComponent(
    code.trim() ? code : null,
    DEFAULT_CUSTOM_WIDGET_CODE,
  );
  const parsedProps = useMemo(() => {
    try { const p = JSON.parse(propsJson); setPropsError(false); return p as Record<string, unknown>; }
    catch { setPropsError(true); return {}; }
  }, [propsJson]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const STARTER = starterCode ?? `({ title = "Mi Widget", accent = "#ff9a5c" }) => (
  <div
    className="h-full w-full flex items-center justify-center rounded-[16px]"
    style={{ background: "rgba(10,10,10,0.85)", border: \`1px solid \${accent}\`, color: "#fff" }}
  >
    <span style={{ fontSize: 28, fontWeight: 600 }}>{title}</span>
  </div>
)`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-stretch bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative m-auto flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-[10px] shadow-2xl overflow-hidden"
        style={{ width: "min(1100px, 96vw)", height: "min(720px, 92vh)" }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 rounded-full bg-[var(--accent)]" />
            <span className="text-[13px] font-semibold text-white">Custom TSX Widget</span>
            <span className="text-[11px] text-[var(--text-muted)]">— {widget.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {!code.trim() && (
              <button
                type="button"
                onClick={() => setCode(STARTER)}
                className="amoled-button-ghost !px-3 !py-1 text-xs"
              >
                Insertar ejemplo
              </button>
            )}
            <button
              type="button"
              onClick={() => { onSave(code, propsJson); onClose(); }}
              className="amoled-button !px-4 !py-1 text-xs"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Editor column */}
          <div className="flex flex-col" style={{ width: "55%" }}>
            <div className="flex-1 min-h-0 border-r border-[var(--border)]">
              <MonacoEditor
                height="100%"
                defaultLanguage="javascript"
                language="javascript"
                value={code}
                onChange={(val) => setCode(val ?? "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  tabSize: 2,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontLigatures: true,
                }}
              />
            </div>
            {/* Props JSON editor */}
            <div className="shrink-0 border-t border-r border-[var(--border)]" style={{ height: 130 }}>
              <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Props JSON</span>
                {propsError && <span className="text-[10px] text-red-400">— JSON inválido</span>}
              </div>
              <MonacoEditor
                height={94}
                defaultLanguage="json"
                language="json"
                value={propsJson}
                onChange={(val) => setPropsJson(val ?? "{}")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: "off",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 4 },
                  tabSize: 2,
                }}
              />
            </div>
          </div>

          {/* Preview column */}
          <div className="flex flex-col flex-1 min-w-0 bg-[var(--background)]">
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-b border-[var(--border)]">
              <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Preview en vivo</span>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top,rgba(255,154,92,0.06),transparent_60%),var(--background)]">
              {code.trim() ? (
                <div
                  className="w-full rounded-[8px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
                  style={{ aspectRatio: `${widget.width}/${widget.height}`, maxHeight: "100%" }}
                >
                  <CustomComponent {...parsedProps} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,154,92,0.3)" strokeWidth="1.5">
                    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                  </svg>
                  <span className="text-xs text-[var(--text-muted)]">Escribe código TSX para ver el preview</span>
                  <button
                    type="button"
                    onClick={() => setCode(STARTER)}
                    className="amoled-button !px-4 !py-1.5 text-xs mt-1"
                  >
                    Insertar ejemplo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_COMPONENT_CODE };

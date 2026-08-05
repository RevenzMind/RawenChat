"use client";

import { useState } from "react";
import type { OverlayWidget, WidgetPanelProps } from "@/types/overlay";
import { getFromStorage, saveToStorage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";
import { DEFAULT_HEADER_CODE } from "@/utils/widgets";
import { DEFAULT_COMPONENT_CODE } from "@/hooks";
import { useSessionPlatform } from "@/hooks";
import { Btn, CustomWidgetEditorModal, PanelDivider, PropSection } from "@/app/components/ui";
import Field from "@/app/components/ui/Field";

export function ChatBoxPanel({ widget: w, upW }: WidgetPanelProps<"chatBox">) {
  const platform = useSessionPlatform();
  const [customEditorOpen, setCustomEditorOpen] = useState<string | null>(null);
  const showFrame   = w.data.showFrame   ?? true;
  const frameTitle  = w.data.frameTitle  ?? "Chat";
  const chatPadding = w.data.chatPadding ?? 0;
  const headerCode  = w.data.headerCode  ?? "";
  const messageCode = w.data.messageCode ?? "";

  // Sin código propio, el editor arranca con el default real del header
  const headerEditorCode = headerCode.trim() || DEFAULT_HEADER_CODE;

  // Para mensajes, arranca con el estilo global de /obs si existe
  const storedObsCode = getFromStorage<string>(STORAGE_KEYS.OBS_CSS) ?? "";
  const messageEditorCode = messageCode.trim() || storedObsCode.trim() || DEFAULT_COMPONENT_CODE;

  return (
    <>
      <PanelDivider />
      <PropSection title="Chat Box">
        <div className="text-[10px] leading-relaxed text-[var(--text-muted)] px-1">
          El canal y la plataforma se toman de la sesión actual.
        </div>
        <Field label={`Padding ${chatPadding}px`}>
          <input type="range" min={0} max={40} className="w-full accent-[var(--accent)]" value={chatPadding}
            onChange={(e) => upW((v) => v.kind === "chatBox" ? { ...v, data: { ...v.data, chatPadding: Number(e.target.value) } } : v)} />
        </Field>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
          <input type="checkbox" className="rawen-checkbox" checked={showFrame}
            onChange={(e) => upW((v) => v.kind === "chatBox" ? { ...v, data: { ...v.data, showFrame: e.target.checked } } : v)} />
          Mostrar frame
        </label>
        {showFrame && (
          <>
            <Field label="Título">
              <input className="amoled-input !py-1 text-xs" value={frameTitle}
                onChange={(e) => upW((v) => v.kind === "chatBox" ? { ...v, data: { ...v.data, frameTitle: e.target.value } } : v)} />
            </Field>
            <Btn full accent onClick={() => setCustomEditorOpen("header")}>
              Editar header{headerCode.trim() ? ` · ${headerCode.trim().split("\n").length}L` : ""}
            </Btn>
          </>
        )}
        <Btn full accent onClick={() => setCustomEditorOpen("message")}>
          Editar mensajes{messageCode.trim() ? ` · ${messageCode.trim().split("\n").length}L` : ""}
        </Btn>
      </PropSection>

      {customEditorOpen === "header" && (
        <CustomWidgetEditorModal
          widget={{ ...w, data: { ...w.data,
            componentCode: headerEditorCode,
            propsJson: JSON.stringify({ title: frameTitle, platform, borderColor: w.style.borderColor, backgroundColor: w.style.backgroundColor, textColor: w.style.textColor, fontFamily: w.style.fontFamily, fontSize: w.style.fontSize }, null, 2),
          } } as unknown as Extract<OverlayWidget, { kind: "custom" }>}
          starterCode={DEFAULT_HEADER_CODE}
          onSave={(code) => upW((v) => v.kind === "chatBox" ? { ...v, data: { ...v.data, headerCode: code } } : v)}
          onClose={() => setCustomEditorOpen(null)}
        />
      )}

      {customEditorOpen === "message" && (
        <CustomWidgetEditorModal
          widget={{ ...w, data: { ...w.data,
            componentCode: messageEditorCode,
            propsJson: JSON.stringify({ msg: { username: "ChatUser", message: "Hola mundo! 🎉", color: "#ff9a5c", timestamp: new Date().toISOString() } }, null, 2),
          } } as unknown as Extract<OverlayWidget, { kind: "custom" }>}
          starterCode={DEFAULT_COMPONENT_CODE}
          onSave={(code) => {
            // Se guarda en OBS_CSS: mismo store que leen /obs y ChatPanel
            saveToStorage(STORAGE_KEYS.OBS_CSS, code);
            if (typeof window !== "undefined" && window.electron) {
              void window.electron.saveObsComponent(code);
            }
            // También en el widget para que la preview sea consistente
            upW((v) => v.kind === "chatBox" ? { ...v, data: { ...v.data, messageCode: code } } : v);
          }}
          onClose={() => setCustomEditorOpen(null)}
        />
      )}
    </>
  );
}

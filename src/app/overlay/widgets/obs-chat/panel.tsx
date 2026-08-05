"use client";

import { useState } from "react";
import type { OverlayWidget, WidgetPanelProps } from "@/types/overlay";
import { getFromStorage, saveToStorage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";
import { DEFAULT_COMPONENT_CODE } from "@/hooks";
import { Btn, CustomWidgetEditorModal, PanelDivider, PropSection } from "@/app/components/ui";

export function ObsChatPanel({ widget: w, upW }: WidgetPanelProps<"obsChat">) {
  const [editorOpen, setEditorOpen] = useState(false);
  const storedObsCode = getFromStorage<string>(STORAGE_KEYS.OBS_CSS) ?? "";
  const obsMessageEditorCode = storedObsCode.trim() || DEFAULT_COMPONENT_CODE;

  return (
    <>
      <PanelDivider />
      <PropSection title="OBS Chat">
        <div className="text-[10px] leading-relaxed text-[var(--text-muted)] px-1">
          El canal y la plataforma se toman de la sesión actual.
        </div>
        <Btn full accent onClick={() => setEditorOpen(true)}>
          Editar mensajes{storedObsCode.trim() ? ` · ${storedObsCode.trim().split("\n").length}L` : ""}
        </Btn>
      </PropSection>

      {editorOpen && (
        <CustomWidgetEditorModal
          widget={{
            ...w,
            data: {
              componentCode: obsMessageEditorCode,
              propsJson: JSON.stringify({
                msg: {
                  username: "ChatUser",
                  message: "Hola mundo! 🎉",
                  color: "#ff9a5c",
                  timestamp: new Date().toISOString(),
                  parts: [
                    { type: "text", text: "Hola mundo! " },
                    { type: "emote", code: "EmoteTest", url: "https://static-cdn.jtvnw.net/emoticons/v2/30259/default/dark/2.0" },
                  ],
                },
              }, null, 2),
            },
          } as unknown as Extract<OverlayWidget, { kind: "custom" }>}
          starterCode={DEFAULT_COMPONENT_CODE}
          onSave={(code) => {
            saveToStorage(STORAGE_KEYS.OBS_CSS, code);
            if (typeof window !== "undefined" && window.electron) {
              void window.electron.saveObsComponent(code);
            }
            window.dispatchEvent(new StorageEvent("storage", {
              key: STORAGE_KEYS.OBS_CSS,
              newValue: code,
            }));
          }}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </>
  );
}

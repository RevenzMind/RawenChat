"use client";

import { useState } from "react";
import type { WidgetPanelProps } from "@/types/overlay";
import { Btn, CustomWidgetEditorModal, PanelDivider, PropSection } from "@/app/components/ui";

export function CustomTsxPanel({ widget, upW }: WidgetPanelProps<"custom">) {
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <>
      <PanelDivider />
      <PropSection title="Custom Widget">
        <Btn full accent onClick={() => setEditorOpen(true)}>
          Editar código
        </Btn>
        {widget.data.componentCode.trim() && (
          <div className="text-[10px] text-[var(--text-muted)] px-1">
            {widget.data.componentCode.trim().split("\n").length} líneas
          </div>
        )}
      </PropSection>
      {editorOpen && (
        <CustomWidgetEditorModal
          widget={widget}
          onSave={(code, propsJson) =>
            upW((v) => v.kind === "custom" ? { ...v, data: { componentCode: code, propsJson } } : v)
          }
          onClose={() => setEditorOpen(false)}
        />
      )}
    </>
  );
}

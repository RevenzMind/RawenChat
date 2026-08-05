"use client";

import { useState } from "react";
import type { OverlayAsset, OverlayWidget } from "@/types/overlay";
import { getWidgetDefinition } from "../widgetRegistry";
import { AlertPropsPanel } from "./AlertPropsPanel";
import { ChatBoxPropsPanel } from "./ChatBoxPropsPanel";
import { ObsChatPropsPanel } from "./ObsChatPropsPanel";
import { NowPlayingPropsPanel } from "./NowPlayingPropsPanel";
import { SchemaPanel } from "./SchemaPanel";
import { CustomWidgetEditorModal } from "./CustomWidgetEditorModal";
import { Btn, PanelDivider, PropSection } from "./ui-primitives";

export function WidgetDataProps({
  w,
  upW,
  visualAssets,
  audioAssets,
}: {
  w: OverlayWidget;
  upW: (fn: (w: OverlayWidget) => OverlayWidget) => void;
  visualAssets: OverlayAsset[];
  audioAssets: OverlayAsset[];
}) {
  const [customEditorOpen, setCustomEditorOpen] = useState<string | null>(null);

  if (w.kind === "alert") {
    return <AlertPropsPanel w={w} upW={upW} visualAssets={visualAssets} audioAssets={audioAssets} />;
  }

  if (w.kind === "chatBox") {
    return <ChatBoxPropsPanel w={w} upW={upW} />;
  }

  if (w.kind === "obsChat") {
    return <ObsChatPropsPanel w={w} upW={upW} />;
  }

  if (w.kind === "nowPlaying") {
    return <NowPlayingPropsPanel w={w} upW={upW} />;
  }

  if (w.kind === "custom") {
    return (
      <>
        <PanelDivider />
        <PropSection title="Custom Widget">
          <Btn full accent onClick={() => setCustomEditorOpen("custom")}>
            Editar código
          </Btn>
          {w.data.componentCode.trim() && (
            <div className="text-[10px] text-[var(--text-muted)] px-1">
              {w.data.componentCode.trim().split("\n").length} líneas
            </div>
          )}
        </PropSection>
        {customEditorOpen === "custom" && (
          <CustomWidgetEditorModal
            widget={w}
            onSave={(code, propsJson) =>
              upW((v) => v.kind === "custom" ? { ...v, data: { componentCode: code, propsJson } } : v)
            }
            onClose={() => setCustomEditorOpen(null)}
          />
        )}
      </>
    );
  }

  // El resto de widgets genera su panel automáticamente desde el registro
  const def = getWidgetDefinition(w.kind);
  if ((def.fields && def.fields.length > 0) || def.hint) {
    return <SchemaPanel w={w} upW={upW} />;
  }

  return null;
}

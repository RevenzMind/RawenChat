"use client";

import { useMemo } from "react";
import type { WidgetPanelProps } from "@/types/overlay";
import { readLastFmConnection } from "@/utils/lastfm";
import Dropdown from "@/app/components/global/Dropdown";
import { PanelDivider, PropSection } from "@/app/components/ui";
import Field from "@/app/components/ui/Field";

export function NowPlayingPanel({ widget, upW }: WidgetPanelProps<"nowPlaying">) {
  const { layout, showAlbumArt } = widget.data;
  const globalConn = useMemo(() => readLastFmConnection(), []);

  return (
    <>
      <PanelDivider />
      <PropSection title="Now Playing · Last.fm">
        {globalConn?.apiKey ? (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-[6px] bg-emerald-400/10 border border-emerald-400/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[10px] text-emerald-300">
              Conectado como <strong>{globalConn.username}</strong>
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-[var(--text-muted)] px-1">
            Conecta Last.fm en Ajustes → Conexiones para activar el widget.
          </div>
        )}

        <PanelDivider />

        <Field label="Layout">
          <Dropdown compact
            options={[
              { value: "compact", label: "Compact" },
              { value: "full", label: "Full" },
            ]}
            value={layout}
            onChange={(value) =>
              upW((v) =>
                v.kind === "nowPlaying"
                  ? { ...v, data: { ...v.data, layout: value as "compact" | "full" } }
                  : v,
              )
            }
          />
        </Field>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            className="rawen-checkbox"
            checked={showAlbumArt}
            onChange={(e) =>
              upW((v) =>
                v.kind === "nowPlaying"
                  ? { ...v, data: { ...v.data, showAlbumArt: e.target.checked } }
                  : v,
              )
            }
          />
          Mostrar portada
        </label>
      </PropSection>
    </>
  );
}

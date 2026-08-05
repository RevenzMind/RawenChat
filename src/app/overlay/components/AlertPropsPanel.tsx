"use client";

import { useState } from "react";
import type { OverlayAsset, OverlayWidget } from "@/types/overlay";
import { ALERT_EVENT_LABELS, DEFAULT_ALERT_TEMPLATES, sanitizeAlertData, sendTestAlert } from "@/utils/alerts";
import { getAssetById } from "@/utils/overlay";
import { useOverlayEditorStore } from "../useOverlayEditorStore";
import { useSessionPlatform } from "@/hooks";
import type { AlertEventKind } from "@/types/overlay";
import Dropdown from "@/app/components/global/Dropdown";
import { AssetPickerButton } from "./AssetPickerButton";
import { AssetPickerPopup } from "./AssetPickerPopup";
import { Btn, Field, PanelDivider, PropSection } from "./ui-primitives";
import { NumberField } from "./NumberField";

export function AlertPropsPanel({
  w,
  upW,
  visualAssets,
  audioAssets,
}: {
  w: Extract<OverlayWidget, { kind: "alert" }>;
  upW: (fn: (w: OverlayWidget) => OverlayWidget) => void;
  visualAssets: OverlayAsset[];
  audioAssets: OverlayAsset[];
}) {
  const sessionPlatform = useSessionPlatform();
  const data = sanitizeAlertData(w.data);
  const { scene } = useOverlayEditorStore();
  const [picker, setPicker] = useState<null | "media" | "sound">(null);
  const mediaAsset = data.mediaAssetId ? getAssetById(scene, data.mediaAssetId) : undefined;
  const soundAsset = data.soundAssetId ? getAssetById(scene, data.soundAssetId) : undefined;
  const upData = (patch: Partial<typeof data>) =>
    upW((v) => (v.kind === "alert" ? { ...v, data: { ...v.data, ...patch } } : v));
  const kinds = Object.keys(ALERT_EVENT_LABELS) as AlertEventKind[];
  const mediaOptions = visualAssets.filter((a) =>
    data.mediaKind === "video" ? a.kind === "video" : a.kind === "image" || a.kind === "gif",
  );

  return (
    <>
      <PanelDivider />
      <PropSection title="Eventos">
        {sessionPlatform === "kick" && (
          <div className="text-[10px] leading-relaxed text-amber-300/90 bg-amber-400/10 border border-amber-400/20 rounded-md px-2.5 py-2">
            Kick no tiene API pública de eventos: las alertas solo funcionan con Twitch.
          </div>
        )}
        <div className="text-[10px] leading-relaxed text-[var(--text-muted)] px-1">
          Conecta tu canal en Configuración → Conexiones. Los eventos llegan en tiempo real vía EventSub.
        </div>
        <div className="space-y-1.5">
          {kinds.map((kind) => (
            <div key={kind} className="flex items-center gap-2">
              <label className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  className="rawen-checkbox"
                  checked={data.events[kind] ?? true}
                  onChange={(e) => upData({ events: { ...data.events, [kind]: e.target.checked } })}
                />
                {ALERT_EVENT_LABELS[kind]}
              </label>
              <Btn onClick={() => void sendTestAlert(kind)}>Probar</Btn>
            </div>
          ))}
        </div>
      </PropSection>

      <PanelDivider />
      <PropSection title="Mensaje">
        {kinds.map((kind) => (
          <Field key={kind} label={ALERT_EVENT_LABELS[kind]}>
            <input
              className="amoled-input !py-1 text-xs"
              value={data.templates[kind] ?? DEFAULT_ALERT_TEMPLATES[kind]}
              onChange={(e) => upData({ templates: { ...data.templates, [kind]: e.target.value } })}
            />
          </Field>
        ))}
        <div className="text-[10px] text-[var(--text-muted)] px-1">Marcadores: {"{user}"} y {"{count}"}</div>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            className="rawen-checkbox"
            checked={data.ttsEnabled}
            onChange={(e) => upData({ ttsEnabled: e.target.checked })}
          />
          Leer en voz alta (TTS)
        </label>
        {data.ttsEnabled && (
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)] pl-5">
            <input
              type="checkbox"
              className="rawen-checkbox"
              checked={data.ttsAfterSound}
              onChange={(e) => upData({ ttsAfterSound: e.target.checked })}
            />
            Leer después del sonido
          </label>
        )}
      </PropSection>

      <PanelDivider />
      <PropSection title="Media y sonido">
        <Field label="Tipo de media">
          <Dropdown
            compact
            options={[
              { value: "none", label: "Ninguna" },
              { value: "image", label: "Imagen / GIF" },
              { value: "video", label: "Video" },
            ]}
            value={data.mediaKind}
            onChange={(value) => upData({ mediaKind: value as "none" | "image" | "video", mediaAssetId: null })}
          />
        </Field>
        {data.mediaKind !== "none" && (
          <Field label="Asset">
            <AssetPickerButton asset={mediaAsset} placeholder="Ninguno — elegir…" onClick={() => setPicker("media")} />
          </Field>
        )}
        <Field label="Sonido">
          <AssetPickerButton asset={soundAsset} placeholder="Ninguno — elegir…" onClick={() => setPicker("sound")} />
        </Field>
        <Field label={`Volumen ${data.soundVolume}%`}>
          <input
            type="range"
            min={0}
            max={100}
            className="w-full accent-[var(--accent)]"
            value={data.soundVolume}
            onChange={(e) => upData({ soundVolume: Number(e.target.value) })}
          />
        </Field>
      </PropSection>

      <PanelDivider />
      <PropSection title="Aparición">
        <div className="grid grid-cols-2 gap-1.5">
          <Field label="Texto">
            <Dropdown
              compact
              options={[
                { value: "bottom", label: "Abajo" },
                { value: "top", label: "Arriba" },
                { value: "center", label: "Centrado" },
              ]}
              value={data.textPosition}
              onChange={(value) => upData({ textPosition: value as "bottom" | "top" | "center" })}
            />
          </Field>
          <Field label="Duración s">
            <NumberField min={2} value={data.duration} onChange={(v) => upData({ duration: v })} />
          </Field>
        </div>
      </PropSection>

      {picker === "media" && (
        <AssetPickerPopup
          title={data.mediaKind === "video" ? "Elegir video" : "Elegir imagen"}
          accept={data.mediaKind === "video" ? "video/*" : "image/*"}
          assets={mediaOptions}
          value={data.mediaAssetId}
          onPick={(id) => upData({ mediaAssetId: id })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "sound" && (
        <AssetPickerPopup
          title="Elegir sonido"
          accept="audio/*"
          assets={audioAssets}
          value={data.soundAssetId}
          onPick={(id) => upData({ soundAssetId: id })}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import type { OverlayAsset, OverlayWidget } from "@/types/overlay";
import { getAssetById } from "@/utils/overlay";
import { getWidgetDefinition, widgetNeedsAssets } from "../widgetRegistry";
import { OVERLAY_FONT_OPTIONS } from "@/constants/overlay";
import Dropdown from "@/app/components/global/Dropdown";
import { AssetPickerButton } from "./AssetPickerButton";
import { AssetPickerPopup } from "./AssetPickerPopup";
import { ColorSwatch } from "./ColorSwatch";
import { NumberField } from "./NumberField";
import { WidgetDataProps } from "./WidgetDataProps";
import { Btn, Field, PanelDivider, PropSection, Row } from "./ui-primitives";

export function PropsPanel({
  selectedWidget,
  scene,
  visualAssets,
  audioAssets,
  upW,
  bringForward,
  sendBackward,
  duplicateWidget,
  removeWidget,
}: {
  selectedWidget: OverlayWidget;
  scene: Parameters<typeof getAssetById>[0];
  visualAssets: OverlayAsset[];
  audioAssets: OverlayAsset[];
  upW: (fn: (w: OverlayWidget) => OverlayWidget) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  duplicateWidget: (id: string) => void;
  removeWidget: (id: string) => void;
}) {
  const w = selectedWidget;
  const kindDef = getWidgetDefinition(w.kind);
  const assetOptions = kindDef.assetFilter
    ? visualAssets.filter((a) => a.kind === kindDef.assetFilter)
    : visualAssets;
  const [assetPicker, setAssetPicker] = useState<null | "primary" | "secondary" | "sound">(null);
  const primaryAsset = getAssetById(scene, w.assets.primaryAssetId);
  const secondaryAsset = getAssetById(scene, w.assets.secondaryAssetId);
  const genericSoundAsset = getAssetById(scene, w.sound.assetId);

  return (
    <div className="space-y-3 pb-2">
      {/* Identity chip */}
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-[5px] border border-[var(--accent-border)] bg-[var(--accent-muted)]">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold truncate">{w.name}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{kindDef.label}</div>
        </div>
      </div>

      <PropSection title="Transform">
        <Field label="Nombre">
          <input
            className="amoled-input !py-1 text-xs"
            value={w.name}
            onChange={(e) => upW((v) => ({ ...v, name: e.target.value }))}
          />
        </Field>
        <Row>
          <Field label="X"><NumberField value={w.x} onChange={(v) => upW((p) => ({ ...p, x: v }))} /></Field>
          <Field label="Y"><NumberField value={w.y} onChange={(v) => upW((p) => ({ ...p, y: v }))} /></Field>
          <Field label="W"><NumberField min={20} value={w.width} onChange={(v) => upW((p) => ({ ...p, width: v }))} /></Field>
          <Field label="H"><NumberField min={20} value={w.height} onChange={(v) => upW((p) => ({ ...p, height: v }))} /></Field>
        </Row>
        <Row>
          <Btn onClick={() => upW((v) => ({ ...v, visible: !v.visible }))}>{w.visible ? "Ocultar" : "Mostrar"}</Btn>
          <Btn onClick={() => upW((v) => ({ ...v, locked: !v.locked }))}>{w.locked ? "Desbloquear" : "Bloquear"}</Btn>
          <Btn onClick={() => bringForward(w.id)}>▲ Capa</Btn>
          <Btn onClick={() => sendBackward(w.id)}>▼ Capa</Btn>
          <Btn onClick={() => duplicateWidget(w.id)}>Duplicar</Btn>
          <Btn onClick={() => removeWidget(w.id)} danger>Eliminar</Btn>
        </Row>
      </PropSection>

      <PanelDivider />

      <PropSection title="Estilo">
        <Field label={`Opacidad ${w.style.opacity}%`}>
          <input
            type="range"
            min={0}
            max={100}
            className="w-full accent-[var(--accent)]"
            value={w.style.opacity}
            onChange={(e) => upW((v) => ({ ...v, style: { ...v.style, opacity: Number(e.target.value) } }))}
          />
        </Field>
        <Row>
          <Field label="Radius">
            <NumberField min={0} value={w.style.borderRadius}
              onChange={(v) => upW((p) => ({ ...p, style: { ...p.style, borderRadius: v } }))} />
          </Field>
          <Field label="Font px">
            <NumberField min={6} value={w.style.fontSize}
              onChange={(v) => upW((p) => ({ ...p, style: { ...p.style, fontSize: v } }))} />
          </Field>
        </Row>
        <Row>
          <Field label="Fuente">
            <Dropdown
              compact
              options={OVERLAY_FONT_OPTIONS.map((f) => ({ value: f, label: f }))}
              value={w.style.fontFamily}
              onChange={(value) => upW((v) => ({ ...v, style: { ...v.style, fontFamily: value } }))}
            />
          </Field>
          <Field label="Animación">
            <Dropdown
              compact
              options={[
                { value: "none", label: "None" },
                { value: "fade", label: "Fade" },
                { value: "slide-up", label: "Slide Up" },
                { value: "pulse", label: "Pulse" },
              ]}
              value={w.style.animation}
              onChange={(value) =>
                upW((v) => ({ ...v, style: { ...v.style, animation: value as OverlayWidget["style"]["animation"] } }))
              }
            />
          </Field>
        </Row>
        <Field label="Color texto">
          <ColorSwatch value={w.style.textColor} onChange={(v) => upW((c) => ({ ...c, style: { ...c.style, textColor: v } }))} />
        </Field>
        <Field label="Fondo">
          <ColorSwatch value={w.style.backgroundColor} onChange={(v) => upW((c) => ({ ...c, style: { ...c.style, backgroundColor: v } }))} />
        </Field>
        <Field label="Borde">
          <ColorSwatch value={w.style.borderColor} onChange={(v) => upW((c) => ({ ...c, style: { ...c.style, borderColor: v } }))} />
        </Field>
      </PropSection>

      <PanelDivider />

      {/* El widget Alert gestiona su propia media/sonido en su panel */}
      {widgetNeedsAssets(w) && w.kind !== "alert" && (
        <>
          <PropSection title="Assets">
            <Field label="Primario">
              <AssetPickerButton asset={primaryAsset} placeholder="Ninguno — elegir…" onClick={() => setAssetPicker("primary")} />
            </Field>
            <Field label="Secundario">
              <AssetPickerButton asset={secondaryAsset} placeholder="Ninguno — elegir…" onClick={() => setAssetPicker("secondary")} />
            </Field>
          </PropSection>
          <PanelDivider />
          {(assetPicker === "primary" || assetPicker === "secondary") && (
            <AssetPickerPopup
              title={assetPicker === "primary" ? "Asset primario" : "Asset secundario"}
              accept={kindDef.assetFilter === "video" ? "video/*" : "image/*"}
              assets={assetOptions}
              value={assetPicker === "primary" ? w.assets.primaryAssetId : w.assets.secondaryAssetId}
              onPick={(id) =>
                upW((v) => ({
                  ...v,
                  assets: { ...v.assets, [assetPicker === "primary" ? "primaryAssetId" : "secondaryAssetId"]: id },
                }))
              }
              onClose={() => setAssetPicker(null)}
            />
          )}
        </>
      )}

      {(["timer", "followerGoal"] as const).includes(w.kind as "timer" | "followerGoal") && (
        <>
          <PropSection title="Sonido">
            <Field label="Audio">
              <AssetPickerButton asset={genericSoundAsset} placeholder="Ninguno — elegir…" onClick={() => setAssetPicker("sound")} />
            </Field>
            <Field label={`Vol ${w.sound.volume}%`}>
              <input
                type="range"
                min={0}
                max={100}
                className="w-full accent-[var(--accent)]"
                value={w.sound.volume}
                onChange={(e) => upW((v) => ({ ...v, sound: { ...v.sound, volume: Number(e.target.value) } }))}
              />
            </Field>
          </PropSection>
          <PanelDivider />
          {assetPicker === "sound" && (
            <AssetPickerPopup
              title="Elegir sonido"
              accept="audio/*"
              assets={audioAssets}
              value={w.sound.assetId}
              onPick={(id) => upW((v) => ({ ...v, sound: { ...v.sound, assetId: id } }))}
              onClose={() => setAssetPicker(null)}
            />
          )}
        </>
      )}

      <WidgetDataProps w={w} upW={upW} visualAssets={visualAssets} audioAssets={audioAssets} />
    </div>
  );
}

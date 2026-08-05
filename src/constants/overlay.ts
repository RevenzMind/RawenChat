import type {
  OverlaySceneConfig,
  OverlayWidget,
  OverlayWidgetStyle,
} from "@/types/overlay";

export const OVERLAY_SCENE_ID = "default";

export const OVERLAY_CANVAS_PRESETS = [
  { label: "1920 x 1080", width: 1920, height: 1080 },
  { label: "1600 x 900", width: 1600, height: 900 },
  { label: "1280 x 720", width: 1280, height: 720 },
] as const;

export const OVERLAY_FONT_OPTIONS = [
  "DM Sans",
  "Inter",
  "Arial",
  "Verdana",
  "monospace",
] as const;

// Los labels de los widgets ahora viven en el registro:
// src/app/overlay/widgetRegistry.ts (WIDGET_REGISTRY)

export const DEFAULT_CUSTOM_WIDGET_CODE = `type WidgetProps = {
  title?: string;
  accent?: string;
  value?: string;
};

({ title = "Custom Widget", accent = "#ff9a5c", value = "Live" }: WidgetProps) => (
  <div
    className="h-full w-full flex items-center justify-between rounded-[18px] border px-5"
    style={{
      background: "rgba(10,10,10,0.78)",
      borderColor: accent,
      color: "#ffffff",
      boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    }}
  >
    <div>
      <div className="text-[12px] uppercase tracking-[0.28em] text-white/50">{title}</div>
      <div className="text-[28px] font-semibold">{value}</div>
    </div>
    <div
      className="h-3 w-3 rounded-full"
      style={{ background: accent, boxShadow: \`0 0 18px \${accent}\` }}
    />
  </div>
)`;

export const DEFAULT_WIDGET_STYLE: OverlayWidgetStyle = {
  opacity: 100,
  fontSize: 22,
  fontFamily: "DM Sans",
  textColor: "#ffffff",
  backgroundColor: "rgba(5, 5, 5, 0.72)",
  borderColor: "rgba(255, 154, 92, 0.32)",
  borderRadius: 18,
  animation: "fade",
};

export const DEFAULT_OVERLAY_SCENE: OverlaySceneConfig = {
  id: OVERLAY_SCENE_ID,
  name: "Main Overlay",
  width: 1920,
  height: 1080,
  backgroundColor: "transparent",
  backgroundAssetId: null,
  widgetAccentColor: "",
  snapToGrid: false,
  showGuides: false,
  updatedAt: new Date(0).toISOString(),
  assets: [],
  widgets: [] satisfies OverlayWidget[],
};

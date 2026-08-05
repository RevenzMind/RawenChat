import type { WidgetDefinition } from "@/types/overlay";

export const mediaVideoDefinition: WidgetDefinition = {
  kind: "mediaVideo",
  label: "Video",
  name: "Video",
  width: 480,
  height: 270,
  style: { backgroundColor: "transparent", borderColor: "transparent" },
  data: { loop: true, muted: true, autoplay: true, objectFit: "cover" },
  usesAssets: true,
  assetFilter: "video",
  sectionTitle: "Video",
  fields: [
    {
      type: "select",
      key: "objectFit",
      label: "Ajuste",
      options: [
        { value: "cover", label: "Cubrir" },
        { value: "contain", label: "Contener" },
        { value: "fill", label: "Estirar" },
      ],
    },
    { type: "checkbox", key: "loop", label: "Loop" },
    { type: "checkbox", key: "muted", label: "Muted" },
    { type: "checkbox", key: "autoplay", label: "Autoplay" },
  ],
};

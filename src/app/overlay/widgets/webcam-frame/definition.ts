import type { WidgetDefinition } from "@/types/overlay";

export const webcamFrameDefinition: WidgetDefinition = {
  kind: "webcamFrame",
  label: "Cámara / Frame",
  name: "Webcam Frame",
  width: 420,
  height: 240,
  data: { label: "Webcam", sourceLabel: "Camera Source", sourceKind: "none" },
  usesAssets: true,
  sectionTitle: "Webcam Frame",
  fields: [
    {
      type: "select",
      key: "sourceKind",
      label: "Fuente",
      options: [
        { value: "none", label: "Decorativo" },
        { value: "webcam", label: "Cámara" },
        { value: "avatar", label: "Avatar 2D" },
      ],
    },
    { type: "text", key: "label", label: "Etiqueta" },
  ],
};

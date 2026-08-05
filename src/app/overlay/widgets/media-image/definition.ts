import type { WidgetDefinition } from "@/types/overlay";

export const mediaImageDefinition: WidgetDefinition = {
  kind: "mediaImage",
  label: "Imagen",
  name: "Imagen",
  width: 400,
  height: 300,
  style: { backgroundColor: "transparent", borderColor: "transparent" },
  data: { objectFit: "contain" },
  usesAssets: true,
  sectionTitle: "Imagen",
  fields: [
    {
      type: "select",
      key: "objectFit",
      label: "Ajuste",
      options: [
        { value: "contain", label: "Contener" },
        { value: "cover", label: "Cubrir" },
        { value: "fill", label: "Estirar" },
      ],
    },
  ],
};

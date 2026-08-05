import type { WidgetDefinition } from "@/types/overlay";

export const streamCardDefinition: WidgetDefinition = {
  kind: "streamCard",
  label: "Tarjeta de canal",
  name: "Stream Card",
  width: 460,
  height: 120,
  data: { subtitle: "", variant: "classic", showAvatar: true },
  // Solo necesita assets cuando el avatar está visible
  usesAssets: (widget) =>
    Boolean((widget.data as { showAvatar?: unknown }).showAvatar ?? true),
  sectionTitle: "Tarjeta de canal",
  fields: [
    {
      type: "select",
      key: "variant",
      label: "Estilo",
      options: [
        { value: "classic", label: "Clásica" },
        { value: "minimal", label: "Minimalista" },
        { value: "pill", label: "Píldora" },
      ],
    },
    { type: "checkbox", key: "showAvatar", label: "Mostrar avatar" },
    { type: "text", key: "subtitle", label: "Subtítulo", placeholder: "Texto opcional bajo el canal" },
  ],
  hint: "El canal y la plataforma (verde/morado) se toman de la sesión actual. La imagen de avatar se elige en Assets → Primario.",
  requires: ["session"],
};

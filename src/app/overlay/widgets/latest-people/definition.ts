import type { WidgetDefinition } from "@/types/overlay";

export const latestPeopleDefinition: WidgetDefinition = {
  kind: "subscriberTicker",
  label: "Latest People",
  name: "Latest People",
  width: 420,
  height: 100,
  data: { label: "", mode: "follow", items: [] },
  sectionTitle: "Latest People",
  fields: [
    {
      type: "select",
      key: "mode",
      label: "Mostrar",
      options: [
        { value: "follow", label: "Latest followers" },
        { value: "subscribe", label: "Latest subscribers" },
        { value: "donators", label: "Latest donators" },
      ],
    },
    { type: "text", key: "label", label: "Texto custom", nullable: true, placeholder: "Vacío = usa el del modo" },
  ],
  hint: "Si el texto custom queda vacío se muestra el del modo. Followers y donators se siembran con el historial real de Twitch; los subscribers se llenan con los eventos en vivo.",
  requires: ["twitch"],
};

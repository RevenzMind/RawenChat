import type { WidgetDefinition } from "@/types/overlay";

export const timerDefinition: WidgetDefinition = {
  kind: "timer",
  label: "Timer",
  name: "Timer",
  width: 280,
  height: 120,
  data: { label: "Countdown", durationSeconds: 180, endAt: null },
  sectionTitle: "Timer",
  fields: [
    { type: "text", key: "label", label: "Etiqueta" },
    { type: "number", key: "durationSeconds", label: "Duración (segundos)" },
    { type: "text", key: "endAt", label: "Fin en (ISO)", mono: true, nullable: true, placeholder: "2025-01-01T00:00:00Z" },
  ],
};

import type { WidgetDefinition } from "@/types/overlay";

export const customTsxDefinition: WidgetDefinition = {
  kind: "custom",
  label: "Custom TSX",
  name: "Custom TSX Widget",
  width: 340,
  height: 160,
  data: { componentCode: "", propsJson: "{}" },
};

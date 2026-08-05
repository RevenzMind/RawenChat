import type { WidgetDefinition } from "@/types/overlay";

export const obsChatDefinition: WidgetDefinition = {
  kind: "obsChat",
  label: "Chat de /obs",
  name: "Chat Overlay",
  width: 520,
  height: 520,
  data: { channel: "", platform: "twitch" },
  requires: ["session"],
};

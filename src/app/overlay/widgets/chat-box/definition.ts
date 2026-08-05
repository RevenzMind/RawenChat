import type { WidgetDefinition } from "@/types/overlay";

export const chatBoxDefinition: WidgetDefinition = {
  kind: "chatBox",
  label: "Chat Box",
  name: "Chat Box",
  width: 440,
  height: 520,
  // Borde accent lo aplica la vista mientras el usuario no lo cambie
  style: {
    backgroundColor: "rgba(5, 5, 5, 0.72)",
    borderColor: "rgba(255, 154, 92, 0.32)",
    borderRadius: 10,
  },
  data: {
    channel: "",
    platform: "twitch",
    showFrame: true,
    frameTitle: "Chat",
    chatPadding: 0,
    headerCode: "",
    messageCode: "",
  },
  requires: ["session"],
};

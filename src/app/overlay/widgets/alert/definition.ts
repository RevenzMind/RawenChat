import type { WidgetDefinition } from "@/types/overlay";

export const alertDefinition: WidgetDefinition = {
  kind: "alert",
  label: "Alert",
  name: "Alert",
  width: 460,
  height: 280,
  data: {
    events: { follow: true, subscribe: true, gift: true, raid: true, cheer: true },
    templates: {
      follow: "{user} te siguió",
      subscribe: "{user} se suscribió",
      gift: "{user} regaló {count} subs",
      raid: "{user} llegó con {count} viewers",
      cheer: "{user} apoyó con {count} bits",
    },
    mediaKind: "none",
    mediaAssetId: null,
    soundAssetId: null,
    soundVolume: 80,

    ttsEnabled: true,
    ttsAfterSound: true,
    textPosition: "bottom",
    duration: 6,
  },
  usesAssets: false,
  sectionTitle: "Alert",
  fields: [],
  requires: ["twitch"],
};

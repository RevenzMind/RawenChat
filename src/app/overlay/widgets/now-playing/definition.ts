import type { WidgetDefinition } from "@/types/overlay";

export const nowPlayingDefinition: WidgetDefinition = {
  kind: "nowPlaying",
  label: "Now Playing",
  name: "Now Playing",
  width: 480,
  height: 100,
  style: {
    backgroundColor: "rgba(5,5,5,0.82)",
    borderColor: "rgba(255,154,92,0.28)",
    borderRadius: 16,
  },
  data: {
    lastfmApiKey: "",
    lastfmUsername: "",
    layout: "compact",
    showProgress: true,
    showAlbumArt: true,
  },
  requires: ["lastfm"],
};

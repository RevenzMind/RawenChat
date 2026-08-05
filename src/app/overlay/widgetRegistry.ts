import type {
  OverlayAssetKind,
  OverlayWidget,
  OverlayWidgetKind,
  OverlayWidgetStyle,
} from "@/types/overlay";

/**
 * Registro central de widgets del overlay.
 *
 * Para añadir un widget nuevo basta con:
 *   1. Agregar su tipo en src/types/overlay.ts
 *   2. Registrar aquí su definición (tamaño, data inicial y campos del panel)
 *   3. Añadir su vista en OverlayCanvas (WidgetView)
 *
 * El editor genera el panel de propiedades automáticamente a partir de
 * `fields`; solo los widgets con UI especial (editores de código, Last.fm…)
 * usan `customPanel` y un panel a mano.
 */

export type WidgetPropField =
  | { type: "text"; key: string; label: string; placeholder?: string; mono?: boolean; /** guarda null si queda vacío */ nullable?: boolean }
  | { type: "number"; key: string; label: string }
  | { type: "checkbox"; key: string; label: string }
  | { type: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { type: "list"; key: string; label: string; itemPlaceholder?: string };

/** Conexiones que puede necesitar un widget; el editor avisa si faltan. */
export type ConnectionNeed = "twitch" | "lastfm" | "session";

export interface WidgetDefinition {
  kind: OverlayWidgetKind;
  /** Nombre visible en el menú "Añadir widget" y en las listas */
  label: string;
  /** Nombre por defecto asignado al crear el widget */
  name: string;
  width: number;
  height: number;
  /** Data inicial del widget (se clona al crear) */
  data: Record<string, unknown>;
  /** Overrides sobre el estilo por defecto */
  style?: Partial<OverlayWidgetStyle>;
  /** Muestra la sección Assets (primario/secundario) en el panel.
   *  boolean o función dinámica según el estado del widget (ej: streamCard
   *  solo necesita assets si el avatar está activado). */
  usesAssets?: boolean | ((widget: OverlayWidget) => boolean);
  /** Filtra los assets de la sección por kind (ej: "video" para el widget de video) */
  assetFilter?: OverlayAssetKind;
  /** Título de la sección de propiedades generada */
  sectionTitle?: string;
  /** Campos declarativos del panel de propiedades */
  fields?: WidgetPropField[];
  /** Nota al pie del panel */
  hint?: string;
  /** true = el widget tiene un panel especial a mano en el editor */
  customPanel?: boolean;
  /** Conexiones requeridas: el editor muestra un aviso si faltan */
  requires?: ConnectionNeed[];
  /** El widget se basta con su propia configuración (ej: API key local) */
  requiresSatisfied?: (widget: OverlayWidget) => boolean;
}

export const WIDGET_REGISTRY: Record<OverlayWidgetKind, WidgetDefinition> = {
  mediaImage: {
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
  },
  mediaVideo: {
    kind: "mediaVideo",
    label: "Video",
    name: "Video",
    width: 480,
    height: 270,
    style: { backgroundColor: "transparent", borderColor: "transparent" },
    data: { loop: true, muted: true, autoplay: true, objectFit: "cover" },
    usesAssets: true,
    assetFilter: "video",
    sectionTitle: "Video",
    fields: [
      {
        type: "select",
        key: "objectFit",
        label: "Ajuste",
        options: [
          { value: "cover", label: "Cubrir" },
          { value: "contain", label: "Contener" },
          { value: "fill", label: "Estirar" },
        ],
      },
      { type: "checkbox", key: "loop", label: "Loop" },
      { type: "checkbox", key: "muted", label: "Muted" },
      { type: "checkbox", key: "autoplay", label: "Autoplay" },
    ],
  },
  webcamFrame: {
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
  },
  obsChat: {
    kind: "obsChat",
    label: "Chat de /obs",
    name: "Chat Overlay",
    width: 520,
    height: 520,
    data: { channel: "", platform: "twitch" },
    customPanel: true,
    requires: ["session"],
  },
  chatBox: {
    kind: "chatBox",
    label: "Chat Box",
    name: "Chat Box",
    width: 440,
    height: 520,
    // Default en sintonía con el resto de widgets: misma superficie oscura sutil,
    // borde accent (lo aplica la vista) y esquinas menos redondeadas.
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
    customPanel: true,
    requires: ["session"],
  },
  alert: {
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
      soundInEditor: false,
      ttsEnabled: true,
      ttsAfterSound: true,
      textPosition: "bottom",
      duration: 6,
    },
    usesAssets: false,
    sectionTitle: "Alert",
    fields: [],
    customPanel: true,
    requires: ["twitch"],
  },
  followerGoal: {
    kind: "followerGoal",
    label: "Follower Goal",
    name: "Follower Goal",
    width: 340,
    height: 160,
    data: { label: "Follower Goal", current: 10, goal: 50 },
    sectionTitle: "Follower Goal",
    fields: [
      { type: "text", key: "label", label: "Etiqueta" },
      { type: "number", key: "goal", label: "Meta" },
    ],
    requires: ["twitch"],
  },
  timer: {
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
  },
  nowPlaying: {
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
    customPanel: true,
    requires: ["lastfm"],
  },
  streamCard: {
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
  },
  subscriberTicker: {
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
  },
  avatar2d: {
    kind: "avatar2d",
    label: "Avatar 2D",
    name: "Avatar 2D",
    width: 420,
    height: 520,
    data: {},
  },
  custom: {
    kind: "custom",
    label: "Custom TSX",
    name: "Custom TSX Widget",
    width: 340,
    height: 160,
    data: { componentCode: "", propsJson: "{}" },
    customPanel: true,
  },
};

/** Orden en el que aparecen los widgets en el menú "Añadir widget". */
export const WIDGET_KIND_ORDER: OverlayWidgetKind[] = [
  "mediaImage", "mediaVideo", "webcamFrame", "obsChat", "chatBox", "alert",
  "followerGoal", "timer", "nowPlaying", "streamCard", "subscriberTicker", "avatar2d", "custom",
];

export function getWidgetDefinition(kind: OverlayWidgetKind): WidgetDefinition {
  return WIDGET_REGISTRY[kind];
}

/** ¿Este widget necesita assets ahora mismo? (decide si se muestra la sección Assets) */
export function widgetNeedsAssets(widget: OverlayWidget): boolean {
  const def = WIDGET_REGISTRY[widget.kind];
  if (!def.usesAssets) return false;
  return typeof def.usesAssets === "function" ? def.usesAssets(widget) : true;
}

export type OverlayAssetKind = "image" | "gif" | "video" | "audio";

export type OverlayWidgetKind =
  | "alert"
  | "chatBox"
  | "followerGoal"
  | "timer"
  | "webcamFrame"
  | "subscriberTicker"
  | "obsChat"
  | "avatar2d"
  | "mediaImage"
  | "mediaVideo"
  | "nowPlaying"
  | "streamCard"
  | "custom";

export type OverlayWidgetAnimation = "none" | "fade" | "slide-up" | "pulse";

export interface OverlayAsset {
  id: string;
  name: string;
  kind: OverlayAssetKind;
  src: string;
  thumbnailSrc: string;
  createdAt: string;
}

export interface OverlayWidgetStyle {
  opacity: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
  animation: OverlayWidgetAnimation;
}

export interface OverlayWidgetSound {
  assetId: string | null;
  volume: number;
  muted: boolean;
}

export interface OverlayWidgetAssetBindings {
  primaryAssetId: string | null;
  secondaryAssetId: string | null;
}

export interface OverlayWidgetBase {
  id: string;
  name: string;
  kind: OverlayWidgetKind;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  style: OverlayWidgetStyle;
  sound: OverlayWidgetSound;
  assets: OverlayWidgetAssetBindings;
}

export interface AlertWidget extends OverlayWidgetBase {
  kind: "alert";
  data: {
    /** Qué eventos disparan la alerta */
    events: Record<AlertEventKind, boolean>;
    /** Plantillas de mensaje — {user} y {count} se reemplazan */
    templates: Record<AlertEventKind, string>;
    mediaKind: "none" | "image" | "video";
    mediaAssetId: string | null;
    soundAssetId: string | null;
    soundVolume: number;
    /** El preview del editor también reproduce el sonido (OBS siempre suena) */
    soundInEditor: boolean;
    ttsEnabled: boolean;
    /** Esperar a que termine el sonido antes de leer el TTS */
    ttsAfterSound: boolean;
    textPosition: "bottom" | "top" | "center";
    /** Segundos que permanece visible cada alerta */
    duration: number;
  };
}

export type AlertEventKind = "follow" | "subscribe" | "gift" | "raid" | "cheer";

/** Alerta en vivo emitida por el motor EventSub (o por el botón de prueba). */
export interface OverlayAlert {
  kind: AlertEventKind;
  platform: "twitch";
  user: string;
  count: number;
  test?: boolean;
}

export interface ChatBoxWidget extends OverlayWidgetBase {
  kind: "chatBox";
  data: {
    /** @deprecated el canal ahora viene de la sesión actual */
    channel: string;
    /** @deprecated la plataforma ahora viene de la sesión actual */
    platform: "twitch" | "kick";
    showFrame: boolean;
    frameTitle: string;
    chatPadding: number;
    headerCode: string;
    messageCode: string;
  };
}

export interface FollowerGoalWidget extends OverlayWidgetBase {
  kind: "followerGoal";
  data: {
    label: string;
    current: number;
    goal: number;
  };
}

export interface TimerWidget extends OverlayWidgetBase {
  kind: "timer";
  data: {
    label: string;
    durationSeconds: number;
    endAt: string | null;
  };
}

export interface WebcamFrameWidget extends OverlayWidgetBase {
  kind: "webcamFrame";
  data: {
    label: string;
    sourceLabel: string;
    /** "none" = solo frame decorativo, "webcam" = cámara real del browser, "avatar" = iframe /avatar */
    sourceKind: "none" | "webcam" | "avatar";
  };
}

export interface SubscriberTickerWidget extends OverlayWidgetBase {
  kind: "subscriberTicker";
  data: {
    label: string;
    /** Qué "latest" muestra: follows, subs o donadores (bits) */
    mode: "follow" | "subscribe" | "donators";
    /** Legado del antiguo Custom People */
    items?: string[];
  };
}

export interface ObsChatWidget extends OverlayWidgetBase {
  kind: "obsChat";
  data: {
    /** @deprecated el canal ahora viene de la sesión actual */
    channel: string;
    /** @deprecated la plataforma ahora viene de la sesión actual */
    platform: "twitch" | "kick";
  };
}

export interface Avatar2DWidget extends OverlayWidgetBase {
  kind: "avatar2d";
  data: Record<string, never>;
}

export interface MediaImageWidget extends OverlayWidgetBase {
  kind: "mediaImage";
  data: {
    objectFit: "cover" | "contain" | "fill";
  };
}

export interface MediaVideoWidget extends OverlayWidgetBase {
  kind: "mediaVideo";
  data: {
    loop: boolean;
    muted: boolean;
    autoplay: boolean;
    objectFit: "cover" | "contain" | "fill";
  };
}

export interface CustomWidget extends OverlayWidgetBase {
  kind: "custom";
  data: {
    componentCode: string;
    propsJson: string;
  };
}

export type StreamCardVariant = "classic" | "minimal" | "pill";

export interface StreamCardWidget extends OverlayWidgetBase {
  kind: "streamCard";
  data: {
    /** Texto secundario bajo el nombre del canal */
    subtitle: string;
    /** Estilo visual de la tarjeta */
    variant: StreamCardVariant;
    /** Mostrar la imagen de avatar (asset primario) */
    showAvatar: boolean;
  };
}

export interface NowPlayingWidget extends OverlayWidgetBase {
  kind: "nowPlaying";
  data: {
    /** Last.fm API key — synced to widget data so live/OBS pages can access it */
    lastfmApiKey: string;
    /** Last.fm username — synced to widget data so live/OBS pages can access it */
    lastfmUsername: string;
    layout: "compact" | "full";
    showProgress: boolean;
    showAlbumArt: boolean;
  };
}

export type OverlayWidget =
  | AlertWidget
  | ChatBoxWidget
  | FollowerGoalWidget
  | TimerWidget
  | WebcamFrameWidget
  | SubscriberTickerWidget
  | ObsChatWidget
  | Avatar2DWidget
  | MediaImageWidget
  | MediaVideoWidget
  | NowPlayingWidget
  | StreamCardWidget
  | CustomWidget;

export interface OverlaySceneConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundAssetId: string | null;
  widgetAccentColor: string;
  snapToGrid: boolean;
  showGuides: boolean;
  widgets: OverlayWidget[];
  assets: OverlayAsset[];
  updatedAt: string;
  /** Sesión inyectada al sincronizar hacia OBS (runtime, no editable por el usuario) */
  sessionChannel?: string;
  sessionPlatform?: "twitch" | "kick";
}

export interface OverlaySettings {
  activeSceneId: string;
  scenes: OverlaySceneConfig[];
}

// Registro de widgets — cada widget vive en src/app/overlay/widgets/<kind>/

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
  /** Muestra la sección Assets; función cuando depende del estado del widget */
  usesAssets?: boolean | ((widget: OverlayWidget) => boolean);
  /** Filtra los assets de la sección por kind (ej: "video") */
  assetFilter?: OverlayAssetKind;
  /** Título de la sección de propiedades generada */
  sectionTitle?: string;
  /** Campos declarativos del panel de propiedades */
  fields?: WidgetPropField[];
  /** Nota al pie del panel */
  hint?: string;
  /** Conexiones requeridas: el editor muestra un aviso si faltan */
  requires?: ConnectionNeed[];
}

/** Props comunes de todas las vistas de widget (canvas y OBS). */
export interface WidgetViewProps<K extends OverlayWidgetKind = OverlayWidgetKind> {
  scene: OverlaySceneConfig;
  widget: Extract<OverlayWidget, { kind: K }>;
  interactive: boolean;
}

/** Props comunes de los paneles custom del editor. */
export interface WidgetPanelProps<K extends OverlayWidgetKind = OverlayWidgetKind> {
  widget: Extract<OverlayWidget, { kind: K }>;
  upW: (fn: (w: OverlayWidget) => OverlayWidget) => void;
  visualAssets: OverlayAsset[];
  audioAssets: OverlayAsset[];
}

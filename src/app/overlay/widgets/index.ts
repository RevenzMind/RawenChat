import type { ComponentType } from "react";
import type {
  OverlayWidgetKind,
  WidgetPanelProps,
  WidgetViewProps,
} from "@/types/overlay";

export { WIDGET_REGISTRY, getWidgetDefinition, widgetNeedsAssets } from "./registry";

import { MediaImageView } from "./media-image/view";
import { MediaVideoView } from "./media-video/view";
import { WebcamFrameView } from "./webcam-frame/view";
import { ObsChatView } from "./obs-chat/view";
import { ChatBoxView } from "./chat-box/view";
import { AlertView } from "./alert/view";
import { FollowerGoalView } from "./follower-goal/view";
import { TimerView } from "./timer/view";
import { NowPlayingView } from "./now-playing/view";
import { StreamCardView } from "./stream-card/view";
import { LatestPeopleView } from "./latest-people/view";
import { Avatar2DView } from "./avatar-2d/view";
import { CustomTsxView } from "./custom-tsx/view";

import { AlertPanel } from "./alert/panel";
import { ChatBoxPanel } from "./chat-box/panel";
import { ObsChatPanel } from "./obs-chat/panel";
import { NowPlayingPanel } from "./now-playing/panel";
import { CustomTsxPanel } from "./custom-tsx/panel";

export const WIDGET_KIND_ORDER: OverlayWidgetKind[] = [
  "mediaImage",
  "mediaVideo",
  "webcamFrame",
  "obsChat",
  "chatBox",
  "alert",
  "followerGoal",
  "timer",
  "nowPlaying",
  "streamCard",
  "subscriberTicker",
  "avatar2d",
  "custom",
];

export const WIDGET_VIEWS: {
  [K in OverlayWidgetKind]: ComponentType<WidgetViewProps<K>>;
} = {
  mediaImage: MediaImageView,
  mediaVideo: MediaVideoView,
  webcamFrame: WebcamFrameView,
  obsChat: ObsChatView,
  chatBox: ChatBoxView,
  alert: AlertView,
  followerGoal: FollowerGoalView,
  timer: TimerView,
  nowPlaying: NowPlayingView,
  streamCard: StreamCardView,
  subscriberTicker: LatestPeopleView,
  avatar2d: Avatar2DView,
  custom: CustomTsxView,
};

export const WIDGET_PANELS: {
  [K in OverlayWidgetKind]?: ComponentType<WidgetPanelProps<K>>;
} = {
  alert: AlertPanel,
  chatBox: ChatBoxPanel,
  obsChat: ObsChatPanel,
  nowPlaying: NowPlayingPanel,
  custom: CustomTsxPanel,
};

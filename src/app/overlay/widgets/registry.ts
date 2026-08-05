import type { OverlayWidget, OverlayWidgetKind, WidgetDefinition } from "@/types/overlay";

import { mediaImageDefinition } from "./media-image/definition";
import { mediaVideoDefinition } from "./media-video/definition";
import { webcamFrameDefinition } from "./webcam-frame/definition";
import { obsChatDefinition } from "./obs-chat/definition";
import { chatBoxDefinition } from "./chat-box/definition";
import { alertDefinition } from "./alert/definition";
import { followerGoalDefinition } from "./follower-goal/definition";
import { timerDefinition } from "./timer/definition";
import { nowPlayingDefinition } from "./now-playing/definition";
import { streamCardDefinition } from "./stream-card/definition";
import { latestPeopleDefinition } from "./latest-people/definition";
import { avatar2dDefinition } from "./avatar-2d/definition";
import { customTsxDefinition } from "./custom-tsx/definition";

export const WIDGET_REGISTRY: Record<OverlayWidgetKind, WidgetDefinition> = {
  mediaImage: mediaImageDefinition,
  mediaVideo: mediaVideoDefinition,
  webcamFrame: webcamFrameDefinition,
  obsChat: obsChatDefinition,
  chatBox: chatBoxDefinition,
  alert: alertDefinition,
  followerGoal: followerGoalDefinition,
  timer: timerDefinition,
  nowPlaying: nowPlayingDefinition,
  streamCard: streamCardDefinition,
  subscriberTicker: latestPeopleDefinition,
  avatar2d: avatar2dDefinition,
  custom: customTsxDefinition,
};

export function getWidgetDefinition(kind: OverlayWidgetKind): WidgetDefinition {
  return WIDGET_REGISTRY[kind];
}

export function widgetNeedsAssets(widget: OverlayWidget): boolean {
  const def = WIDGET_REGISTRY[widget.kind];
  if (!def.usesAssets) return false;
  return typeof def.usesAssets === "function" ? def.usesAssets(widget) : true;
}

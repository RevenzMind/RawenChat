import type { WidgetDefinition } from "@/types/overlay";

export const followerGoalDefinition: WidgetDefinition = {
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
};

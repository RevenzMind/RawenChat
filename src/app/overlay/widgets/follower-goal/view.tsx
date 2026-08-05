"use client";

import type { WidgetViewProps } from "@/types/overlay";
import { useSessionChannel, useSessionPlatform } from "@/hooks";
import { useTwitchFollowerCount } from "@/hooks";
import { getWidgetSurfaceStyle } from "@/utils/widgets";

export function FollowerGoalView({ scene, widget }: WidgetViewProps<"followerGoal">) {
  const channel = useSessionChannel();
  const platform = useSessionPlatform();
  const followers = useTwitchFollowerCount(channel, platform);

  const current = followers ?? widget.data.current;
  const progress = Math.max(0, Math.min(100, (current / Math.max(1, widget.data.goal)) * 100));
  return (
    <div className="h-full w-full border shadow-[0_18px_50px_rgba(0,0,0,0.35)] p-5 flex flex-col justify-between"
      style={getWidgetSurfaceStyle(scene, widget)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.72em] uppercase tracking-[0.24em] text-white/55">Goal</div>
          <div className="text-[1.05em] font-semibold">{widget.data.label}</div>
        </div>
        <div className="text-right">
          <div className="text-[1.15em] font-semibold">{widget.data.goal}</div>
          <div className="text-[0.72em] text-white/55">meta de followers</div>
        </div>
      </div>
      <div className="h-4 rounded-full bg-black/35 overflow-hidden border border-white/8">
        <div className="h-full rounded-full"
          style={{ width: `${progress}%`, background: "linear-gradient(90deg,#ff9a5c 0%,#f97316 100%)" }} />
      </div>
    </div>
  );
}

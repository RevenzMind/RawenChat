"use client";

import { useEffect, useMemo, useState } from "react";
import type { WidgetViewProps } from "@/types/overlay";
import { formatSeconds } from "@/utils/overlay";
import { getWidgetSurfaceStyle } from "@/utils/widgets";

export function TimerView({ scene, widget }: WidgetViewProps<"timer">) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  const remainingSeconds = useMemo(() => {
    if (!widget.data.endAt) return widget.data.durationSeconds;
    return Math.max(0, Math.floor((new Date(widget.data.endAt).getTime() - now) / 1000));
  }, [now, widget.data.durationSeconds, widget.data.endAt]);
  return (
    <div className="h-full w-full border shadow-[0_18px_50px_rgba(0,0,0,0.35)] flex flex-col items-center justify-center text-center px-4"
      style={getWidgetSurfaceStyle(scene, widget)}>
      <div className="text-[0.72em] uppercase tracking-[0.28em] text-white/55">{widget.data.label}</div>
      <div className="text-[1.9em] font-semibold tracking-[0.06em]">{formatSeconds(remainingSeconds)}</div>
    </div>
  );
}

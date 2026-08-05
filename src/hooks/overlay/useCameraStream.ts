"use client";

import { useEffect } from "react";
import { startCameraPublisher, stopCameraPublisher } from "@/utils/camera-hub";
import { useOverlayEditorStore } from "@/app/overlay/useOverlayEditorStore";
import type { WebcamFrameWidget } from "@/types/overlay";

export function CameraStreamBridge() {
  const scenes = useOverlayEditorStore((s) => s.scenes);

  const hasWebcam = scenes.some((scene) =>
    scene.widgets.some(
      (w) =>
        w.kind === "webcamFrame" &&
        (w as WebcamFrameWidget).data.sourceKind === "webcam" &&
        w.visible !== false
    )
  );

  useEffect(() => {
    if (!hasWebcam) return;
    startCameraPublisher();
    return () => stopCameraPublisher();
  }, [hasWebcam]);

  return null;
}

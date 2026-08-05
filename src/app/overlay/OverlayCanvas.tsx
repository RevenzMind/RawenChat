"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OverlaySceneConfig, OverlayWidget, WidgetViewProps } from "@/types/overlay";
import { getAssetById } from "@/utils/overlay";
import { getAnimationClass } from "@/utils/widgets";
import { WIDGET_VIEWS } from "./widgets";

interface OverlayCanvasProps {
  scene: OverlaySceneConfig;
  selectedWidgetId?: string | null;
  interactive?: boolean;
  /** Factor CSS scale del ancestro: convierte coords de pantalla a coords de canvas */
  scale?: number;
  className?: string;
  onSelectWidget?: (widgetId: string | null) => void;
  onWidgetChange?: (widgetId: string, widget: OverlayWidget) => void;
  onWidgetAssetDrop?: (widgetId: string, assetId: string) => void;
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface DragState {
  widgetId: string;
  /** Offset del puntero dentro del widget al iniciar el drag */
  offsetX: number;
  offsetY: number;
}

interface ResizeState {
  widgetId: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  startLeft: number;
  startTop: number;
}

// Dispatcher: resuelve la vista del widget desde el registro
function WidgetView({ scene, widget, interactive }: {
  scene: OverlaySceneConfig;
  widget: OverlayWidget;
  interactive: boolean;
}) {
  const View = WIDGET_VIEWS[widget.kind] as ComponentType<WidgetViewProps>;
  return <View scene={scene} widget={widget} interactive={interactive} />;
}

const HANDLE_SIZE = 10;

const HANDLES: { id: ResizeHandle; cursor: string; getStyle: (w: number, h: number) => React.CSSProperties }[] = [
  { id: "nw", cursor: "nw-resize", getStyle: () => ({ top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2, width: HANDLE_SIZE, height: HANDLE_SIZE }) },
  { id: "n",  cursor: "n-resize",  getStyle: (w) => ({ top: -HANDLE_SIZE/2, left: w/2 - HANDLE_SIZE/2, width: HANDLE_SIZE, height: HANDLE_SIZE }) },
  { id: "ne", cursor: "ne-resize", getStyle: (w) => ({ top: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2, width: HANDLE_SIZE, height: HANDLE_SIZE }) },
  { id: "e",  cursor: "e-resize",  getStyle: (w, h) => ({ top: h/2 - HANDLE_SIZE/2, right: -HANDLE_SIZE/2, width: HANDLE_SIZE, height: HANDLE_SIZE }) },
  { id: "se", cursor: "se-resize", getStyle: (w, h) => ({ bottom: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2, width: HANDLE_SIZE, height: HANDLE_SIZE }) },
  { id: "s",  cursor: "s-resize",  getStyle: (w, h) => ({ bottom: -HANDLE_SIZE/2, left: w/2 - HANDLE_SIZE/2, width: HANDLE_SIZE, height: HANDLE_SIZE }) },
  { id: "sw", cursor: "sw-resize", getStyle: (w, h) => ({ bottom: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2, width: HANDLE_SIZE, height: HANDLE_SIZE }) },
  { id: "w",  cursor: "w-resize",  getStyle: (w, h) => ({ top: h/2 - HANDLE_SIZE/2, left: -HANDLE_SIZE/2, width: HANDLE_SIZE, height: HANDLE_SIZE }) },
];

export function OverlayCanvas({
  scene,
  selectedWidgetId = null,
  interactive = false,
  scale = 1,
  className = "",
  onSelectWidget,
  onWidgetChange,
  onWidgetAssetDrop,
}: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Overrides locales durante drag/resize para no escribir al store por frame
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, { x: number; y: number; width: number; height: number }>
  >({});

  const dragRef        = useRef<DragState | null>(null);
  const resizeRef      = useRef<ResizeState | null>(null);
  const scaleRef       = useRef(scale);
  const overridesRef   = useRef(localOverrides);
  const sceneRef       = useRef(scene);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { overridesRef.current = localOverrides; }, [localOverrides]);
  useEffect(() => { sceneRef.current = scene; }, [scene]);

  // clientX/Y de un PointerEvent a coords de canvas
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      cx: (clientX - rect.left) / scaleRef.current,
      cy: (clientY - rect.top)  / scaleRef.current,
    };
  }, []);

  const snapTo = useCallback((v: number) =>
    scene.snapToGrid ? Math.round(v / 20) * 20 : v,
  [scene.snapToGrid]);

  // pointermove / pointerup globales durante drag o resize
  useEffect(() => {
    if (!interactive) return;

    function onPointerMove(e: PointerEvent) {
      const { cx, cy } = toCanvas(e.clientX, e.clientY);
      const currentScene = sceneRef.current;

      if (dragRef.current) {
        const { widgetId, offsetX, offsetY } = dragRef.current;
        const widget = currentScene.widgets.find((w) => w.id === widgetId);
        if (!widget) return;
        const x = snapTo(Math.max(0, Math.min(currentScene.width  - widget.width,  cx - offsetX)));
        const y = snapTo(Math.max(0, Math.min(currentScene.height - widget.height, cy - offsetY)));
        setLocalOverrides((prev) => ({ ...prev, [widgetId]: { x, y, width: widget.width, height: widget.height } }));
        return;
      }

      if (resizeRef.current) {
        const { widgetId, handle, startX, startY, startW, startH, startLeft, startTop } = resizeRef.current;
        const dx = cx - startX;
        const dy = cy - startY;
        const MIN = 40;
        let newX = startLeft, newY = startTop, newW = startW, newH = startH;
        if (handle.includes("e")) newW = Math.max(MIN, snapTo(startW + dx));
        if (handle.includes("s")) newH = Math.max(MIN, snapTo(startH + dy));
        if (handle.includes("w")) { newW = Math.max(MIN, snapTo(startW - dx)); newX = startLeft + (startW - newW); }
        if (handle.includes("n")) { newH = Math.max(MIN, snapTo(startH - dy)); newY = startTop  + (startH - newH); }
        setLocalOverrides((prev) => ({ ...prev, [widgetId]: { x: newX, y: newY, width: newW, height: newH } }));
        return;
      }
    }

    function onPointerUp() {
      const currentScene = sceneRef.current;
      const currentOverrides = overridesRef.current;

      if (dragRef.current) {
        const { widgetId } = dragRef.current;
        const ov = currentOverrides[widgetId];
        const widget = currentScene.widgets.find((w) => w.id === widgetId);
        if (widget && ov) onWidgetChange?.(widgetId, { ...widget, x: ov.x, y: ov.y });
        dragRef.current = null;
        setLocalOverrides((prev) => { const n = { ...prev }; delete n[widgetId]; return n; });
      }
      if (resizeRef.current) {
        const { widgetId } = resizeRef.current;
        const ov = currentOverrides[widgetId];
        const widget = currentScene.widgets.find((w) => w.id === widgetId);
        if (widget && ov) onWidgetChange?.(widgetId, { ...widget, x: ov.x, y: ov.y, width: ov.width, height: ov.height });
        resizeRef.current = null;
        setLocalOverrides((prev) => { const n = { ...prev }; delete n[widgetId]; return n; });
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup",   onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup",   onPointerUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, toCanvas, snapTo, onWidgetChange]);

  const backgroundAsset = getAssetById(scene, scene.backgroundAssetId);
  const hasBackgroundImage = backgroundAsset && (backgroundAsset.kind === "image" || backgroundAsset.kind === "gif");
  const showTransparencyGrid = interactive && scene.backgroundColor.trim().toLowerCase() === "transparent" && !hasBackgroundImage;
  const sortedWidgets = [...scene.widgets].filter((w) => w.visible).sort((a, b) => a.zIndex - b.zIndex);

  function getPos(widget: OverlayWidget) {
    const ov = localOverrides[widget.id];
    return {
      x:      ov?.x      ?? widget.x,
      y:      ov?.y      ?? widget.y,
      width:  ov?.width  ?? widget.width,
      height: ov?.height ?? widget.height,
    };
  }

  return (
    <div
      ref={canvasRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: `${scene.width}px`,
        height: `${scene.height}px`,
        backgroundColor: showTransparencyGrid ? "#0a0a0a" : scene.backgroundColor,
        backgroundImage: hasBackgroundImage
          ? `url(${backgroundAsset.src})`
          : showTransparencyGrid
            ? "linear-gradient(45deg,#111 25%,transparent 25%),linear-gradient(-45deg,#111 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#111 75%),linear-gradient(-45deg,transparent 75%,#111 75%)"
            : undefined,
        backgroundSize: hasBackgroundImage ? "cover" : showTransparencyGrid ? "32px 32px" : undefined,
        backgroundPosition: hasBackgroundImage ? "center" : showTransparencyGrid ? "0 0,0 16px,16px -16px,-16px 0" : undefined,
      }}
      onPointerDown={(e) => {
        // Click en canvas vacío = deseleccionar
        if (e.target === canvasRef.current) onSelectWidget?.(null);
      }}
    >
      {interactive && scene.showGuides && (
        <>
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/6 pointer-events-none" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/6 pointer-events-none" />
        </>
      )}

      {sortedWidgets.map((widget) => {
        const isSelected  = widget.id === selectedWidgetId;
        const isDraggable = interactive && !widget.locked;
        const pos         = getPos(widget);
        const animClass   = getAnimationClass(widget.style.animation);

        return (
          <div
            key={widget.id}
            className={`absolute ${animClass}`}
            style={{ left: pos.x, top: pos.y, width: pos.width, height: pos.height, zIndex: widget.zIndex }}
            onPointerDown={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              onSelectWidget?.(widget.id);

              // Drag solo desde el cuerpo del widget, no desde los handles
              if (!isDraggable) return;
              if ((e.target as HTMLElement).dataset.resizeHandle) return;

              e.preventDefault();
              const { cx, cy } = toCanvas(e.clientX, e.clientY);
              dragRef.current = { widgetId: widget.id, offsetX: cx - pos.x, offsetY: cy - pos.y };
              document.body.style.cursor = "grabbing";
              document.body.style.userSelect = "none";
            }}
            onClick={(e) => { e.stopPropagation(); onSelectWidget?.(widget.id); }}
            onDragOver={(e) => { if (interactive) e.preventDefault(); }}
            onDrop={(e) => {
              if (!interactive) return;
              e.preventDefault(); e.stopPropagation();
              const assetId = e.dataTransfer.getData("text/rawenchat-asset-id");
              if (assetId) onWidgetAssetDrop?.(widget.id, assetId);
            }}
          >
            <div className="h-full w-full" style={{ cursor: isDraggable ? "grab" : "default" }}>
              <WidgetView scene={scene} widget={widget} interactive={interactive} />
            </div>

            {/* Ring de selección / bloqueo */}
            {interactive && (
              <div className={`absolute inset-0 rounded-[inherit] pointer-events-none transition-all ${
                isSelected ? "ring-2 ring-[#ff9a5c]" : "ring-1 ring-white/8"
              } ${widget.locked ? "border border-dashed border-[#fbbf24]" : ""}`} />
            )}

            {/* Badge con el nombre */}
            {interactive && (
              <div className="absolute left-3 top-3 flex items-center gap-2 pointer-events-none">
                <span className="rounded-full bg-black/65 border border-white/10 px-2.5 py-1 text-[11px] text-white/80">{widget.name}</span>
                {widget.locked && (
                  <span className="rounded-full bg-[#fbbf24]/15 border border-[#fbbf24]/30 px-2.5 py-1 text-[11px] text-[#fbbf24]">Locked</span>
                )}
              </div>
            )}

            {/* Handles de resize solo si está seleccionado y sin bloqueo */}
            {interactive && isSelected && !widget.locked && HANDLES.map((h) => (
              <div
                key={h.id}
                data-resize-handle={h.id}
                className="absolute bg-white border-2 border-[#ff9a5c] rounded-sm z-10"
                style={{ ...h.getStyle(pos.width, pos.height), position: "absolute", cursor: h.cursor }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const { cx, cy } = toCanvas(e.clientX, e.clientY);
                  resizeRef.current = {
                    widgetId: widget.id,
                    handle: h.id,
                    startX: cx, startY: cy,
                    startW: pos.width, startH: pos.height,
                    startLeft: pos.x, startTop: pos.y,
                  };
                  document.body.style.cursor = h.cursor;
                  document.body.style.userSelect = "none";
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

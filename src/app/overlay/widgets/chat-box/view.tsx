"use client";

import type { WidgetViewProps } from "@/types/overlay";
import { DEFAULT_WIDGET_STYLE } from "@/constants/overlay";
import { useCustomRenderableComponent } from "@/hooks";
import { useSessionChannel, useSessionPlatform } from "@/hooks";
import { DEFAULT_HEADER_CODE } from "@/utils/widgets";

const HEADER_PX = 40;

export function ChatBoxView({ scene, widget, interactive }: WidgetViewProps<"chatBox">) {
  // Canal y plataforma siempre vienen de la sesión actual
  const channel     = useSessionChannel();
  const platform    = useSessionPlatform();
  const showFrame   = widget.data.showFrame   ?? true;
  const frameTitle  = widget.data.frameTitle  ?? "Chat";
  const chatPadding = widget.data.chatPadding ?? 0;
  const headerCode  = widget.data.headerCode  ?? "";
  const messageCode = widget.data.messageCode ?? "";

  // messageCode viaja al /obs como parámetro en base64
  const codeParam = messageCode.trim()
    ? (() => { try { return btoa(messageCode); } catch { return ""; } })()
    : "";

  const obsUrl = [
    `/obs?channel=${encodeURIComponent(channel)}`,
    `&platform=${platform}`,
    codeParam ? `&code=${encodeURIComponent(codeParam)}` : "",
  ].join("");

  const noChannel = !channel;

  const HeaderComponent = useCustomRenderableComponent(
    headerCode.trim() ? headerCode : null,
    DEFAULT_HEADER_CODE,
  );

  // Borde: usa el accent de la escena mientras el user no lo haya cambiado
  // (default del registro o valores legacy del viejo Chat Box → gana el accent)
  const accentColor = scene.widgetAccentColor?.trim() || widget.style.borderColor;
  const legacyBorder = ["transparent", "#000", "#000000", "black"];
  const borderColor =
    widget.style.borderColor === DEFAULT_WIDGET_STYLE.borderColor ||
    legacyBorder.includes(widget.style.borderColor.trim().toLowerCase())
      ? accentColor
      : widget.style.borderColor;

  const headerProps = {
    title: frameTitle,
    platform,
    borderColor,
    backgroundColor: widget.style.backgroundColor,
    textColor: widget.style.textColor,
    fontFamily: widget.style.fontFamily,
    fontSize: widget.style.fontSize,
  };

  return (
    <div className="relative h-full w-full overflow-hidden border"
      style={{
        opacity: widget.style.opacity / 100,
        background: widget.style.backgroundColor,
        borderColor,
        borderRadius: `${widget.style.borderRadius}px`,
      }}>

      {/* Iframe del chat /obs, desplazado bajo el header + padding */}
      {!noChannel && (
        <iframe
          key={obsUrl}
          src={obsUrl}
          title={`Chat ${channel}`}
          className="absolute border-0 bg-transparent pointer-events-none"
          style={{
            left: chatPadding,
            right: chatPadding,
            bottom: chatPadding,
            top: showFrame ? HEADER_PX + chatPadding : chatPadding,
            width: `calc(100% - ${chatPadding * 2}px)`,
            height: showFrame
              ? `calc(100% - ${HEADER_PX + chatPadding * 2}px)`
              : `calc(100% - ${chatPadding * 2}px)`,
          }}
        />
      )}

      {showFrame && (
        <div className="absolute inset-0 pointer-events-none border rounded-[inherit] overflow-hidden"
          style={{ borderColor: widget.style.borderColor }}>
          <div style={{ height: HEADER_PX }}>
            <HeaderComponent {...headerProps} />
          </div>
        </div>
      )}

      {/* Placeholder en el editor cuando no hay sesión de chat */}
      {interactive && noChannel && (
        <div className="absolute inset-0 flex items-center justify-center border border-dashed border-[var(--accent-border)] bg-black/70 px-6 text-center text-sm text-white/70 pointer-events-none"
          style={{ top: showFrame ? HEADER_PX : 0 }}>
          Conecta tu chat (Twitch o Kick) para verlo aquí.
        </div>
      )}
    </div>
  );
}

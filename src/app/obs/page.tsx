"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import * as tmi from "tmi.js";
import { useSearchParams } from "next/navigation";
import { getKickChatroomId, getKickWebSocketUrl } from "@/utils/kick";
import { buildKickParts, buildTwitchParts, type ChatMessagePart } from "@/utils/emotes";
import { type ChatPlatform } from "@/utils/platform";
import { STORAGE_KEYS } from "@/constants/config";
import { getFromStorage } from "@/utils/storage";
import { useCustomMessageComponent, DEFAULT_COMPONENT_CODE } from "@/hooks";
import { TailwindRuntimeLoader } from "@/app/components/shared/TailwindRuntimeLoader";

interface MessageProps {
  timestamp: string;
  username: string | undefined;
  message: string;
  color?: string | undefined;
  parts?: ChatMessagePart[];
}

const REMOTE_COMPONENT_URL = "http://127.0.0.1:3003/obs-component";
const REMOTE_COMPONENT_POLL_MS = 2000;


function useRemoteComponentCode(): string {
  const [code, setCode] = useState("");

  useEffect(() => {
    let active = true;

    const fetchRemoteCode = async (): Promise<string | null> => {
      try {
        const response = await fetch(REMOTE_COMPONENT_URL);
        if (!response.ok) return null;
        const data = await response.json();
        return data?.componentCode || null;
      } catch {
        return null;
      }
    };

    const refresh = async () => {
      const remote = await fetchRemoteCode();
      if (!active) return;
      if (remote) {
        setCode(remote);
      } else {
        setCode((prev) => prev || getFromStorage<string>(STORAGE_KEYS.OBS_CSS) || DEFAULT_COMPONENT_CODE);
      }
    };

    refresh();
    const intervalId = setInterval(refresh, REMOTE_COMPONENT_POLL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  return code;
}

function useTwitchChat(channel: string | null, onMessage: (msg: MessageProps) => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!channel) return;

    const client = new tmi.Client({
      connection: {
        secure: true,
        reconnect: true,
      },
      channels: [channel.toLowerCase()],
    });

    client
      .connect()
      .then(() => console.log(`Connected to Twitch channel: ${channel}`))
      .catch((err) => console.error("Failed to connect to Twitch:", err));

    client.on("message", (_channel, tags, message, self) => {
      if (self) return;
      onMessageRef.current({
        timestamp: new Date().toISOString(),
        username: tags.username,
        message,
        color: tags.color || undefined,
        parts: buildTwitchParts(message, tags.emotes),
      });
    });

    return () => {
      client.disconnect();
    };
  }, [channel]);
}

function useKickChat(channel: string | null, onMessage: (msg: MessageProps) => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!channel) return;

    let ws: WebSocket | null = null;
    let active = true;

    getKickChatroomId(channel)
      .then((chatroomId) => {
        if (!active) return;
        ws = new WebSocket(getKickWebSocketUrl());

        ws.onopen = () => {
          ws?.send(
            JSON.stringify({
              event: "pusher:subscribe",
              data: { auth: "", channel: `chatrooms.${chatroomId}.v2` },
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data as string) as {
              event?: string;
              data?: unknown;
            };
            if (payload.event !== "App\\Events\\ChatMessageEvent") return;

            const parsedData =
              typeof payload.data === "string" ? JSON.parse(payload.data) : payload.data;
            const data = parsedData as {
              content?: string;
              sender?: { username?: string; slug?: string };
            };
            if (!data?.content) return;

            onMessageRef.current({
              timestamp: new Date().toISOString(),
              username: data.sender?.username || data.sender?.slug || "kick_user",
              message: data.content,
              parts: buildKickParts(data.content),
            });
          } catch (err) {
            console.error("Failed to parse Kick WebSocket message:", err);
          }
        };
      })
      .catch((err) => console.error("Failed to connect to Kick:", err));

    return () => {
      active = false;
      ws?.close();
    };
  }, [channel]);
}

function ObsPageContent() {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const channel = searchParams.get("channel");
  const platform = (searchParams.get("platform") || "twitch").toLowerCase() as ChatPlatform;
  // Optional base64-encoded custom message component code passed by the overlay editor
  const codeParam = searchParams.get("code");

  useEffect(() => {
    if (!channel) {
      console.error("No channel parameter provided. Use ?channel=channelname");
    }
  }, [channel]);

  const remoteCode = useRemoteComponentCode();
  // URL param wins over remote code when present
  const componentCode = codeParam
    ? (() => { try { return atob(codeParam); } catch { return remoteCode; } })()
    : remoteCode;
  const MessageComponent = useCustomMessageComponent(componentCode);

  const appendMessage = (msg: MessageProps) => setMessages((prev) => [...prev, msg]);

  useTwitchChat(platform === "twitch" ? channel : null, appendMessage);
  useKickChat(platform === "kick" ? channel : null, appendMessage);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <>
      <TailwindRuntimeLoader />
      <div
        ref={messagesContainerRef}
        className="messages-container h-screen overflow-y-auto bg-transparent hide-scrollbar"
        style={{ scrollBehavior: "smooth" }}
      >
        {messages.map((msg) => (
          <MessageComponent key={`${msg.timestamp}-${msg.username}`} msg={msg} />
        ))}
      </div>
    </>
  );
}

export default function ObsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-gray-400">
          Cargando...
        </div>
      }
    >
      <ObsPageContent />
    </Suspense>
  );
}
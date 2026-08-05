"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as tmi from "tmi.js";
import { RateLimitManager } from "@sapphire/ratelimits";
import { DEFAULTS } from "@/constants/config";
import { getRandomColor } from "@/constants/colors";
import { getKickChatroomId, getKickWebSocketUrl } from "@/utils/kick";
import { buildKickParts, buildTwitchParts, partsToText, sanitizeForTts } from "@/utils/emotes";
import type { ChatPlatform } from "@/utils/platform";
import type { Command } from "@/app/components/sidebar/CommandsPanel";
import type { IncomingChatMessage, MessageProps } from "@/app/types/chat";

interface UseChatConnectionOptions {
  channel: string;
  commands: Command[];
  platform: ChatPlatform;
  commandVolume: number;
  onTtsMessage: (message: string) => void;
  maxMessages?: number;
}

function runCommand(command: Command, username: string, volume: number): void {
  const actionType = command.actionType || "key";

  if ((actionType === "key" || actionType === "both") && window.electron) {
    window.electron.pressKey(command.key).catch(console.error);
  }

  if ((actionType === "sound" || actionType === "both") && command.soundFile) {
    try {
      const audio = new Audio(
        command.soundFile.startsWith("data:")
          ? command.soundFile
          : `/${command.soundFile}`
      );
      audio.volume = volume / 100;
      audio.play().catch(console.error);
    } catch (err) {
      console.error(`Error executing command for ${username}:`, err);
    }
  }
}

export function useChatConnection({
  channel,
  commands,
  platform,
  commandVolume,
  onTtsMessage,
  maxMessages = 200,
}: UseChatConnectionOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<MessageProps[]>([]);

  const commandsRef = useRef(commands);
  const commandVolumeRef = useRef(commandVolume);
  const lastSpeakerRef = useRef<string | null>(null);
  const rateLimitersRef = useRef<Map<string, RateLimitManager<string>>>(new Map());
  const disconnectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  useEffect(() => {
    commandVolumeRef.current = commandVolume;
  }, [commandVolume]);

  const handleIncomingMessage = useCallback(
    (incoming: IncomingChatMessage) => {
      const username = incoming.username || "Anónimo";
      const rawMessage = incoming.message;
      const trigger = rawMessage.trim().toLowerCase();

      const command = commandsRef.current.find((cmd) => cmd.trigger === trigger);

      const newMessage: MessageProps = {
        timestamp: new Date().toISOString(),
        username,
        message: rawMessage,
        color: incoming.color || getRandomColor(),
        parts: incoming.parts,
      };

      setMessages((prev) => {
        const updated = [...prev, newMessage];
        return updated.length > maxMessages ? updated.slice(-maxMessages) : updated;
      });

      if (command) {
        const limitKey = command.rateLimitType === "global" ? "global" : username.toLowerCase();
        let limiter = rateLimitersRef.current.get(command.trigger);

        if (!limiter) {
          limiter = new RateLimitManager(
            command.timeout || DEFAULTS.COMMAND_TIMEOUT_MS,
            1
          );
          rateLimitersRef.current.set(command.trigger, limiter);
        }

        const rateLimit = limiter.acquire(limitKey);
        if (!rateLimit.limited) {
          rateLimit.consume();
          runCommand(command, username, commandVolumeRef.current);
        }
        return;
      }

      const shouldSayName = lastSpeakerRef.current !== username;
      const cleanMessage = sanitizeForTts(
        incoming.parts ? partsToText(incoming.parts) : rawMessage
      );
      if (!cleanMessage) return;

      if (shouldSayName) {
        onTtsMessage(`${username} dice: ${cleanMessage}`);
        lastSpeakerRef.current = username;
      } else {
        onTtsMessage(cleanMessage);
      }
    },
    [onTtsMessage, maxMessages]
  );

  const disconnect = useCallback(() => {
    disconnectRef.current?.();
    disconnectRef.current = null;
    setIsConnected(false);
    setMessages([]);
    lastSpeakerRef.current = null;
    rateLimitersRef.current.clear();
  }, []);

  useEffect(() => {
    if (!channel) return;
    disconnect();

    if (platform === "twitch") {
      const client = new tmi.Client({ channels: [channel.toLowerCase()] });
      disconnectRef.current = () => client.disconnect().catch(console.error);

      client.connect().then(() => setIsConnected(true)).catch(console.error);

      client.on("message", (_ch, tags, message) => {
        handleIncomingMessage({
          username: tags.username,
          message,
          color: tags.color,
          parts: buildTwitchParts(message, tags.emotes),
        });
      });
    } else {
      let ws: WebSocket | null = null;
      let isActive = true;

      disconnectRef.current = () => {
        isActive = false;
        ws?.close();
      };

      getKickChatroomId(channel)
        .then((chatroomId) => {
          if (!isActive) return;
          ws = new WebSocket(getKickWebSocketUrl());

          ws.onopen = () => {
            ws?.send(
              JSON.stringify({
                event: "pusher:subscribe",
                data: { auth: "", channel: `chatrooms.${chatroomId}.v2` },
              })
            );
            setIsConnected(true);
          };

          ws.onmessage = (event) => {
            try {
              const payload = JSON.parse(event.data as string);
              if (payload.event !== "App\\Events\\ChatMessageEvent") return;

              const data =
                typeof payload.data === "string" ? JSON.parse(payload.data) : payload.data;

              if (!data?.content) return;

              handleIncomingMessage({
                username: data.sender?.username || data.sender?.slug || "kick_user",
                message: data.content,
                parts: buildKickParts(data.content),
              });
            } catch (err) {
              console.error("Kick parse error:", err);
            }
          };

          ws.onerror = () => setIsConnected(false);
          ws.onclose = () => setIsConnected(false);
        })
        .catch(console.error);
    }

    return disconnect;
  }, [channel, platform, handleIncomingMessage, disconnect]);

  return { disconnect, isConnected, messages };
}

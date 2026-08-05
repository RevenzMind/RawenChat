import type { ChatMessagePart } from "@/utils/emotes";

export type { ChatMessagePart };

export interface MessageProps {
  timestamp: string;
  username: string | undefined;
  message: string;
  color?: string | undefined;
  /** Mensaje segmentado en texto/emotes para renderizar imágenes */
  parts?: ChatMessagePart[];
}

export interface IncomingChatMessage {
  username?: string;
  message: string;
  color?: string;
  parts?: ChatMessagePart[];
}

export type SidebarTab = "chat" | "commands" | "avatar" | "overlay";


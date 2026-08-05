// Emote parsing para Twitch (tag IRC) y Kick (tokens [emote:ID:NAME])
// Devuelve "parts" para renderizar texto + imágenes, y helpers para el TTS.

export interface ChatEmotePart {
  type: "emote";
  code: string;
  url: string;
}

export interface ChatTextPart {
  type: "text";
  text: string;
}

export type ChatMessagePart = ChatTextPart | ChatEmotePart;

interface EmoteRange {
  start: number;
  end: number; // exclusivo
  url: string;
}

export type TwitchEmoteTag = string | Record<string, string[]> | undefined;

/**
 * Parsea el tag `emotes` de IRC de Twitch.
 * Acepta el formato crudo "id:start-end,start-end/id:..." o el objeto
 * parseado por tmi.js `{ [id]: ["start-end", ...] }`.
 */
function parseTwitchEmoteTag(tag: TwitchEmoteTag): EmoteRange[] {
  if (!tag) return [];

  const chunks =
    typeof tag === "string"
      ? tag.split("/")
      : Object.entries(tag).map(([id, ranges]) => `${id}:${ranges.join(",")}`);

  const ranges: EmoteRange[] = [];

  for (const chunk of chunks) {
    const [id, rangesPart] = chunk.split(":");
    if (!id || !rangesPart) continue;

    for (const pair of rangesPart.split(",")) {
      const [start, end] = pair.split("-").map(Number);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      ranges.push({
        start,
        end: end + 1,
        url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`,
      });
    }
  }

  return ranges.sort((a, b) => a.start - b.start);
}

export function buildTwitchParts(message: string, emoteTag?: TwitchEmoteTag): ChatMessagePart[] {
  const ranges = parseTwitchEmoteTag(emoteTag);
  if (ranges.length === 0) return [{ type: "text", text: message }];

  const parts: ChatMessagePart[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      parts.push({ type: "text", text: message.slice(cursor, range.start) });
    }
    const code = message.slice(range.start, range.end);
    parts.push({ type: "emote", code, url: range.url });
    cursor = range.end;
  }

  if (cursor < message.length) {
    parts.push({ type: "text", text: message.slice(cursor) });
  }

  return parts;
}

const KICK_EMOTE_RE = /\[emote:(\d+):([^\]]+)\]/g;

/**
 * Kick manda los emotes inline como `[emote:ID:NAME]`.
 */
export function buildKickParts(content: string): ChatMessagePart[] {
  const parts: ChatMessagePart[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  KICK_EMOTE_RE.lastIndex = 0;
  while ((match = KICK_EMOTE_RE.exec(content))) {
    if (match.index > last) {
      parts.push({ type: "text", text: content.slice(last, match.index) });
    }
    parts.push({
      type: "emote",
      code: match[2],
      url: `https://files.kick.com/emotes/${match[1]}/fullsize`,
    });
    last = match.index + match[0].length;
  }

  if (last < content.length) {
    parts.push({ type: "text", text: content.slice(last) });
  }

  return parts.length > 0 ? parts : [{ type: "text", text: content }];
}

/** Solo el texto plano de las parts (sin emotes) — para el TTS. */
export function partsToText(parts: ChatMessagePart[]): string {
  return parts
    .filter((p): p is ChatTextPart => p.type === "text")
    .map((p) => p.text)
    .join("");
}

const URL_RE = /https?:\/\/\S+/gi;

/** Quita URLs y compacta espacios (para que el TTS no las lea). */
export function sanitizeForTts(text: string): string {
  return text.replace(URL_RE, " ").replace(/\s+/g, " ").trim();
}

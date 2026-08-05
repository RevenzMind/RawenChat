import { EdgeTTS } from "@andresaya/edge-tts";

export async function getVoicesByLanguage(language: string): Promise<string[]> {
  try {
    const tts = new EdgeTTS();
    const voices = await Promise.race([
      tts.getVoicesByLanguage(language),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000)),
    ]);

    return Array.isArray(voices)
      ? voices
          .map((v) => {
            if (typeof v === "string") return v;
            const obj = v as Record<string, unknown>;
            return (
              (typeof obj.name === "string" ? obj.name : "") ||
              (typeof obj.ShortName === "string" ? obj.ShortName : "") ||
              (typeof obj.LocalName === "string" ? obj.LocalName : "") ||
              ""
            );
          })
          .filter(Boolean)
      : [];
  } catch (error) {
    console.error("get-voices error:", error);
    return [];
  }
}

export async function speakMessage(text: string, language: string, voice: string): Promise<string> {
  if (!text) throw new Error("Text is required");

  const tts = new EdgeTTS();
  const chunks: Uint8Array[] = [];
  const voiceParam = voice || language;

  for await (const chunk of tts.synthesizeStream(text, voiceParam)) {
    chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
  }

  return Buffer.concat(chunks).toString("base64");
}

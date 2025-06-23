"use client";
import MessagesRender from "@/app/components/chat/messagesRender";
import { useEffect } from "react";
import * as tmi from "tmi.js";
import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

interface MessageProps {
  timestamp: string;
  username: string | undefined;
  message: string;
  color?: string | undefined;
}

function speakMessage(message?: string): { cancel: () => void } {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "es-ES";
    window.speechSynthesis.speak(utterance);
    return {
      cancel: () => window.speechSynthesis.cancel(),
    };
  }

  return {
    cancel: () => {},
  };
}

export default function ObsPage() {
  const params = useParams();
  const channel = params.channel?.toString();
  const [Messages, SetMessages] = useState<MessageProps[]>([]);
  const [TTS, SetTTS] = useState(false);
  const ttsRef = useRef(TTS);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [Render, SetRender] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 10);

    return () => clearTimeout(timer);
  }, [Messages]);

  useEffect(() => {
    if (Render && Messages.length > 0) {
      scrollToBottom();
    }
  }, [Render, Messages.length]);

  useEffect(() => {
    const ttsEnabled = searchParams.get("tts");
    const render = searchParams.get("render");
    
    if (ttsEnabled === "true") {
      SetTTS(true);
    } else {
      SetTTS(false);
    }
    
    if (!render || render === "true") {
      SetRender(true);
    } else {
      SetRender(false);
    }
  }, [searchParams]);

  useEffect(() => {
    ttsRef.current = TTS;
  }, [TTS]);

  useEffect(() => {
    if (!channel) {
      router.push("/");
      return;
    }

    const client = new tmi.Client({
      channels: [channel.toLowerCase()],
    });

    client
      .connect()
      .then(() => {
        console.log(`Connected to channel: ${channel}`);
      })
      .catch((err) => {
        console.error("Failed to connect:", err);
      });
      
    client.on("message", (channel, tags, message, self) => {
      if (self) return;

      const newMessage: MessageProps = {
        timestamp: new Date().toISOString(),
        username: tags.username,
        message: message,
        color: tags.color || undefined,
      };

      SetMessages((prevMessages) => [...prevMessages, newMessage]);

      if (ttsRef.current) {
        speakMessage(`${tags.username} dice: ${message}`);
      }
    });

    return () => {
      client.disconnect();
    };
  }, [channel, router]);

  return (
    <div 
      ref={messagesContainerRef}
      className="messages-container h-screen overflow-y-hidden "
      style={{ 
        scrollBehavior: 'smooth' 
      }}
    >
      {Render ? (
        Messages.length > 0 ? (
          Messages.map((msg) => (
            <MessagesRender ShowTime={false} msg={msg} key={`${msg.timestamp}-${msg.username}`} />
          ))
        ) : (
          <span className="text-gray-500 text-sm">
            Esperando nuevos mensajes...
          </span>
        )
      ) : (
        <></>
      )}
    </div>
  );
}
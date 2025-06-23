"use client";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useEffect, useRef } from "react";
import * as tmi from "tmi.js";
import { FluentEmoji } from "@lobehub/fluent-emoji";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import MessagesRender from "@/app/components/chat/messagesRender";
import ModalOverlay from "@/app/components/global/overlay";
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

function ApplyRandomColor() {
  const colors = [
    "#FF5733",
    "#33FF57",
    "#3357FF",
    "#F1C40F",
    "#8E44AD",
    "#E74C3C",
    "#3498DB",
    "#2ECC71",
    "#9B59B6",
    "#F39C12",
    "#D35400",
    "#1ABC9C",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default function ChannelPage() {
  const [IsConnected, SetConnect] = useState(false);
  const [Messages, SetMessages] = useState<MessageProps[]>([]);
  const [TTS, SetTTS] = useState(true);
  const ttsRef = useRef(TTS);
  const [autoScroll, SetAutoScroll] = useState(true);
  const params = useParams();
  const channel = params.channel?.toString();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    if (autoScroll) {
      requestAnimationFrame(() => {
        const div = document.querySelector(".messages-container");
        if (div) {
          div.scrollTop = div.scrollHeight;
        }
      });
    }
  }, [Messages, autoScroll]);
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
        SetConnect(true);
      })
      .catch((err) => {
        console.error("Failed to connect:", err);
        SetConnect(false);
      });

    client.on("message", (channel, tags, message) => {
      if (ttsRef.current) speakMessage(`${tags.username} dice: ${message}`);
      const newMessage: MessageProps = {
        timestamp: new Date().toISOString(),
        username: tags.username,
        message: message,
        color: tags.color || ApplyRandomColor(),
      };
      SetMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    return () => {
      if (client.readyState() === "OPEN")
        client
          .disconnect()
          .then(() => {
            console.log("Disconnected from channel");
          })
          .catch((err) => {
            console.error("Failed to disconnect:", err);
          });
    };
  }, [channel, router]);
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        IsConnected={IsConnected}
        TTS={TTS}     
        speakMessage={speakMessage}
        openModal={openModal}
      />

      <div
        className={`h-2 transition-all duration-700 ${
          IsConnected ? "w-full bg-green-600" : "w-3/12 bg-red-950"
        }`}
      />

      <div className="flex-1 overflow-hidden">
        <div className="messages-container h-full overflow-y-auto ">
          {Messages.length > 0 ? (
            Messages.map((msg) => (
              <MessagesRender
                msg={msg}
                key={`${msg.timestamp}-${msg.username}`}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4 bg-[#18181b] p-6 rounded-lg animate-fade-in">
                <div className="animate-bounce">
                  <FluentEmoji type="anim" size={64} emoji="💬" />
                </div>
                <h3 className="text-xl font-semibold text-white">Chat vacío</h3>
                <p className="text-gray-400 text-base text-center">
                  No hay mensajes en el chat de {channel} todavía
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-500 text-sm">
                    Esperando nuevos mensajes...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer
        IsConnected={IsConnected}
        channel={channel}
        MessageCount={Messages.length}
      />
      <ModalOverlay isOpen={isModalOpen} onClose={closeModal}>
        <div className="flex items-center gap-3 flex-col">
          <h1 className="text-xl font-semibold">Configuration</h1>
         <div>

         </div>
         <div className="flex flex-col gap-2 w-full">
           <input
          onChange={() => {
            SetTTS(!TTS);
            ttsRef.current = !TTS;
          }}
          type="checkbox"
          name="TTSCheck"
          className="hidden"
          id="TTS"
          />
          <label
          htmlFor="TTS"
          className={` gap-2 w-full transition-colors duration-100 cursor-pointer inline-flex items-center text-sm select-none px-6 py-2 ${
            TTS
            ? "bg-green-600 hover:bg-green-800"
            : "bg-red-300 hover:bg-red-400"
          } rounded-sm`}
          >
          {TTS ? (
            <FluentEmoji type="anim" size={20} emoji="🔊"></FluentEmoji>
          ) : (
            <FluentEmoji type="anim" size={20} emoji="🔇"></FluentEmoji>
          )}
          TTS
          </label>
         
          <button
          type="button"
          className={`px-6 w-full py-2 cursor-pointer text-sm inline-flex gap-2 transition-colors duration-100 rounded-sm ${
            autoScroll
            ? "bg-green-600 hover:bg-green-800"
            : "bg-red-950 hover:bg-red-900"
          }`}
          onClick={() => SetAutoScroll(!autoScroll)}
          >
          <FluentEmoji type="flat" size={20} emoji="⚙️"></FluentEmoji>
          Auto Scroll
          </button>
         </div>
        </div>
        <div className="flex items-center justify-center mt-4 text-gray-400 text-sm">
                  <span>tap anywhere to exit</span>

        </div>
      </ModalOverlay>
    </div>
  );
}

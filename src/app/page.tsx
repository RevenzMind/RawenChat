"use client";
import { FluentEmoji } from "@lobehub/fluent-emoji";
import { useEffect, useRef, useState } from "react";





export default function Home() {
  const [user, setUser] = useState<string>("");
  const StartBTN = useRef<HTMLButtonElement>(null);
  const InputUser = useRef<HTMLInputElement>(null);
function GotoChat(channel: string | undefined) {
  if (channel) {
    const url = `/chat/${channel}`;
    window.location.href = url;
  } else {
    alert("No hay un canal valido.");
  }
}
 useEffect(() => {
  const handleInput = () => {
    if (InputUser.current) {
      const value = InputUser.current.value.trim();
      setUser(value);
    }
  };

  const inputElement = InputUser.current;
  inputElement?.addEventListener("input", handleInput);
  
  return () => {
    inputElement?.removeEventListener("input", handleInput);
  };
}, []); 

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#f5f5f5] dark:bg-[#202020] p-4">
     <div className="dark:bg-[#2c2c2c] rounded-xl shadow-sm border dark:border-[#383838] max-w-3/5 w-full relative">
       <div className="grid grid-cols-2 gap-8 p-6">
         <section className="col-span-1">
           <header className="mb-4">
             <div className="flex">
               <FluentEmoji type="anim" size={72} emoji="😸" />
             </div>
             <h1 className="text-3xl font-semibold mt-4">Bienvenido a RawenChat</h1>
             <p className="text-gray-600 dark:text-gray-300 mt-2">
               Una experiencia de chat minimalista y elegante para tus transmisiones en vivo.
             </p>
           </header>
          
           <ul className="mt-6 text-gray-600 dark:text-gray-300 space-y-2">
             {[
               "Conexión rápida y fácil a tu canal de Twitch.",
               "Soporte para mensajes de texto a voz (TTS).",
               "Interfaz limpia y sin distracciones.",
               "Compatible con OBS y otras plataformas de transmisión.",
               "Facil uso y sin costo alguno",
               "Open Source en GitHub"
             ].map((feature, index) => (
               <li key={index} className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                 {feature}
               </li>
             ))}
           </ul>
         </section>

         <section className="col-span-1">
          <div className="flex mb-6">
               <FluentEmoji type="anim" size={72} emoji="☄️" />
             </div>
           <h2 className="text-2xl font-semibold mb-4">EMPIEZA AHORA</h2>
           <p className="text-gray-600 dark:text-gray-300 mb-4">
             Coloca tu canal de Twitch para iniciar la experiencia
           </p>
           <input
             type="text" ref={InputUser}
             placeholder="Ingresa el nombre de tu canal de Twitch"
             className="mt-6 w-full p-3 border border-gray-300 dark:border-[#444444] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
           />
             <button ref={StartBTN}
              onClick={() => GotoChat(user)}
              disabled={!user}
             className="mt-4 w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
             >
             Iniciar Chat
             </button>
             <a 
             href="https://github.com/RevenzMind/RawenChat" 
             target="_blank" 
             rel="noopener noreferrer" 
             className="mt-3 px-4 py-3 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm"
             >
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
               <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
             </svg>
             Star On Github
             </a>
         </section>
       </div>

       <div className="absolute top-6 bottom-6 left-1/2 transform -translate-x-1/2 w-px bg-gray-300 dark:bg-[#383838]"></div>
     </div>
    </main>
  );
}
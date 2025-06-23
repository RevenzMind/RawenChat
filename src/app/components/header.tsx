import { FluentEmoji } from "@lobehub/fluent-emoji";


interface HeaderProps {
    IsConnected: boolean;
    TTS: boolean;
    speakMessage: (message?: string) => { cancel: () => void };
    openModal: (value: boolean) => void;
}

    

export default function Header(
    { 
        IsConnected, 
        TTS, 
        speakMessage, 
        openModal,
    }: HeaderProps
) {
    return (
     <>
        <div className="flex-shrink-0 flex items-center bg-[#18181b94] justify-between px-4 py-3">
        <div className="bg-[#18181b] px-4 py-3 rounded-lg flex items-center justify-between gap-4">
          <div className="items-center flex">
            <div
              className={`absolute rounded-full ${
                IsConnected ? "bg-green-500" : "bg-red-500"
              } w-2 h-2`}
            ></div>
            <div
              className={`absolute animate-ping rounded-full ${
                IsConnected ? "bg-green-500/70" : "bg-red-500/70"
              } w-2 h-2`}
            ></div>
          </div>

          <h1 className="gap-2 text-xl  font-bold inline-flex items-center">
            <FluentEmoji type="anim" size={25} emoji="😺"></FluentEmoji>
           RawenChat
          </h1>
        </div>
        <div className="flex items-center gap-3">

{TTS ? <>
<button
            className="px-6 py-2 cursor-pointer text-sm inline-flex gap-2 bg-red-950 hover:bg-red-900 transition-colors duration-100 rounded-sm"
            onClick={() => speakMessage()?.cancel()}
          >
            <FluentEmoji type="flat" size={20} emoji="🔇"></FluentEmoji>
            Stop TTS Speak
          </button>
          </> : <></>}

          

            
<button onClick={() => {
    openModal(true);
}} className="bg-[#18181b] hover:bg-[#27272a] px-4 py-2 rounded-md transition-colors shadow-sm inline-flex items-center gap-2 text-gray-300 font-medium">
    <FluentEmoji type="anim" size={20} emoji="⚙️" />
    Configuración
</button>
        </div>
      </div>
      </>
    );
}
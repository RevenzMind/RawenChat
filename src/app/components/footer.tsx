import { FluentEmoji } from "@lobehub/fluent-emoji";

interface FooterProps {
  IsConnected: boolean;
  channel: string | undefined;
  MessageCount: number;
}

export default function Footer({
  IsConnected,
  channel,
  MessageCount,
}: FooterProps) {
  return (
    <footer className="flex-shrink-0 h-16 bg-[#121214] border-t border-[#27272a] flex items-center justify-between px-6 gap-4">
        <div
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                IsConnected 
                ? "bg-green-600/20 text-green-400 border border-green-600/30" 
                : "bg-amber-600/20 text-amber-400 border border-amber-600/30"
            }`}
        >
            <div className={`w-2 h-2 rounded-full ${IsConnected ? "bg-green-400" : "bg-amber-400"} animate-pulse`}></div>
            <span>{IsConnected ? "Connected" : "Connecting"}</span>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#1d1d20] hover:bg-[#27272a] px-4 py-2 rounded-md transition-colors shadow-sm">
                <FluentEmoji type="anim" size={20} emoji="💬" />
                <span className="font-medium">{MessageCount}</span>
            </div>
            
            <div className="flex items-center gap-2 bg-[#1d1d20] hover:bg-[#27272a] px-4 py-2 rounded-md transition-colors shadow-sm">
                <FluentEmoji type="anim" size={20} emoji="🔗" />
                <span className="font-medium truncate max-w-[200px]">{channel || "No channel selected"}</span>
            </div>
            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  `${window.location}/obs?tts=false&render=true`
                ).then(() => {
                  alert("OBS Overlay URL copied to clipboard!");
                })
              }
              className="bg-[#1d1d20] cursor-pointer hover:bg-[#27272a] inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors shadow-sm text-gray-300 font-medium"
            >
              <FluentEmoji type="anim" size={20} emoji="🔗" />
              OBS Overlay
            </button>
        </div>
    </footer>
  );
}

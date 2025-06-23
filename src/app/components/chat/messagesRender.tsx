interface TwitchMessage {
  timestamp: string;
  username: string | undefined;
  message: string;
  color?: string | undefined;
}

interface MessageProps {
  msg: TwitchMessage;
  ShowTime?: boolean;
}

export default function MessagesRender({ msg, ShowTime = true }: MessageProps) {
  return (
    <div className="px-4">
      <div className="bg-[#18181b] p-4 rounded-lg my-2 items-center inline-flex gap-2">
        {ShowTime && (
          <span className="text-gray-400 text-xs">
            {new Date(msg.timestamp).toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        <span className="font-bold" style={{ color: msg.color || "white" }}>
          {msg.username}:
        </span>
        <p className="text-sm break-words">{msg.message}</p>
      </div>
    </div>
  );
}
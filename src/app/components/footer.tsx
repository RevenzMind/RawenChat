interface FooterProps {
  IsConnected: boolean;
  channel: string | undefined;
  MessageCount: number;
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export default function Footer({
  IsConnected,
  channel,
  MessageCount,
}: FooterProps) {
  return (
    <footer className="status-bar">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${IsConnected ? "bg-[var(--success)]" : "bg-[var(--warning)]"} animate-pulse-dot`}
        />
        <span className={IsConnected ? "text-[var(--success)]" : "text-[var(--warning)]"}>
          {IsConnected ? "Conectado" : "Conectando..."}
        </span>
      </div>

      <div className="flex items-center gap-4 text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <IconChat className="w-3.5 h-3.5" />
          {MessageCount} mensajes
        </span>
        <span className="flex items-center gap-1.5 max-w-[180px] truncate">
          <IconLink className="w-3.5 h-3.5 shrink-0" />
          {channel || "—"}
        </span>
      </div>
    </footer>
  );
}

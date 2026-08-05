import React from "react";
import type { Command } from "../CommandsPanel";

export type IconProps = { className?: string };

function iconProps(className = "h-4 w-4") {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
}

export function TerminalIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

export function KeyboardIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01" />
      <path d="M9 14h6" />
    </svg>
  );
}

export function VolumeIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m6 3 14 9-14 9V3z" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function MusicIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function GamepadIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 12h4M8 10v4" />
      <path d="M15 13h.01M18 11h.01" />
    </svg>
  );
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

export function FlameIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

export function GiftIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9.7 3 12 5 12 8c0-3 2.3-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

export function SmileIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01M15 9h.01" />
    </svg>
  );
}

export function DiceIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" />
    </svg>
  );
}

export function ZapIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function RocketIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function SwordsIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
    </svg>
  );
}

export function GhostIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M9 10h.01M15 10h.01" />
      <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
    </svg>
  );
}

type IdentityIcon = (p: IconProps) => React.ReactElement;

const IDENTITY_RULES: { match: RegExp; Icon: IdentityIcon }[] = [
  { match: /music|m[uú]sica|song|canci[oó]n|radio|playlist/, Icon: MusicIcon },
  { match: /game|juego|gaming|play|partida/, Icon: GamepadIcon },
  { match: /love|amor|heart|coraz[oó]n|ship|beso/, Icon: HeartIcon },
  { match: /fire|fuego|flame|hype|epic|moments/, Icon: FlameIcon },
  { match: /drop|gift|regalo|loot|reward|premio/, Icon: GiftIcon },
  { match: /hola|hello|\bhi\b|saludo|welcome|bienvenid/, Icon: SmileIcon },
  { match: /suerte|luck|dado|dice|random|azar|ruleta/, Icon: DiceIcon },
  { match: /rayo|zap|boost|speed|energ[ií]a|power/, Icon: ZapIcon },
  { match: /rocket|cohete|launch|despeg|moon/, Icon: RocketIcon },
  { match: /star|estrella|brillo|shine|vip/, Icon: StarIcon },
  { match: /fight|pelea|pvp|sword|espada|batalla|duelo/, Icon: SwordsIcon },
  { match: /ghost|fantasma|spooky|miedo|susto/, Icon: GhostIcon },
];

const IDENTITY_FALLBACK: IdentityIcon[] = [
  ZapIcon, StarIcon, RocketIcon, DiceIcon, FlameIcon, GamepadIcon, MusicIcon, GhostIcon,
];

const IDENTITY_COLORS = ["#ff9a5c", "#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#fb7185"];

export function commandIdentity(cmd: Command): { Icon: IdentityIcon; color: string } {
  const text = `${cmd.trigger} ${cmd.name}`.toLowerCase();
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
  const rule = IDENTITY_RULES.find((r) => r.match.test(text));
  const Icon = rule?.Icon ?? IDENTITY_FALLBACK[seed % IDENTITY_FALLBACK.length];
  return { Icon, color: IDENTITY_COLORS[seed % IDENTITY_COLORS.length] };
}

export function ActionGlyph({ type, className }: { type: Command["actionType"]; className?: string }) {
  if (type === "sound") return <VolumeIcon className={className} />;
  if (type === "both") {
    return (
      <span className="flex items-center gap-1">
        <KeyboardIcon className={className} />
        <VolumeIcon className={className} />
      </span>
    );
  }
  return <KeyboardIcon className={className} />;
}

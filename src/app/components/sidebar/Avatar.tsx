import Image from 'next/image';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  AVATAR_DEFAULTS,
  AVATAR_EVENTS,
  type AvatarSettings,
} from '@/constants/avatar';
import {
  persistAvatarSettingsForOverlay,
  readAvatarSettings,
  readAvatarImage,
  readAvatarThreshold,
  sendAvatarTalkingState,
  updateAvatarSettings,
} from '@/utils/avatar';
import type { AvatarStateDetail } from '@/hooks';
import { Card, Field } from '../ui';
import Dropdown from '../global/Dropdown';

interface AudioDevice {
  deviceId: string;
  label: string;
}

function iconAttrs(className = 'h-4 w-4') {
  return {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function PlayCircleIcon({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  );
}

function PauseCircleIcon({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M10 9v6M14 9v6" />
    </svg>
  );
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-md bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)]">
        {icon}
      </div>
      <h2 className="text-sm font-semibold text-white tracking-wide">{title}</h2>
    </div>
  );
}

const METER_SEGMENTS = 28;

interface VolumeMeterProps {
  threshold: number;
  isTalking: boolean;
  onThresholdChange: (value: number) => void;
}

// Keeps the fast volume subscription local so the parent page never
// re-renders on audio ticks.
export const VolumeMeter = memo(function VolumeMeter({
  threshold,
  isTalking,
  onThresholdChange,
}: VolumeMeterProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [volume, setVolume] = useState(() => window.currentVolume ?? 0);

  useEffect(() => {
    const handleState = (event: Event) => {
      setVolume((event as CustomEvent<AvatarStateDetail>).detail.volume);
    };
    window.addEventListener(AVATAR_EVENTS.STATE_CHANGE, handleState);
    return () => window.removeEventListener(AVATAR_EVENTS.STATE_CHANGE, handleState);
  }, []);

  const lit = Math.round((volume / 100) * METER_SEGMENTS);
  const markerPercent = Math.max(6, Math.min(94, threshold));

  const commitFromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const percent = Math.max(1, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    onThresholdChange(percent);
  };

  const markerColor = isTalking ? 'var(--success)' : 'var(--accent)';

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Umbral de activación"
      aria-valuemin={1}
      aria-valuemax={100}
      aria-valuenow={threshold}
      tabIndex={0}
      className="relative pt-7 pb-1 cursor-ew-resize select-none touch-none outline-none group"
      onPointerDown={(event) => {
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        commitFromPointer(event.clientX);
      }}
      onPointerMove={(event) => {
        if (draggingRef.current) commitFromPointer(event.clientX);
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') onThresholdChange(Math.max(1, threshold - 1));
        if (event.key === 'ArrowRight') onThresholdChange(Math.min(100, threshold + 1));
      }}
    >
      <div className="flex items-end gap-[3px] h-9">
        {Array.from({ length: METER_SEGMENTS }, (_, index) => {
          const segmentPercent = ((index + 0.5) / METER_SEGMENTS) * 100;
          const isLit = index < lit;
          const aboveThreshold = segmentPercent >= threshold;
          return (
            <span
              key={index}
              className="flex-1 rounded-[3px] transition-colors duration-100"
              style={{
                height: `${35 + (index / METER_SEGMENTS) * 65}%`,
                background: !isLit
                  ? 'var(--elevated)'
                  : aboveThreshold
                    ? 'var(--success)'
                    : 'var(--accent)',
                opacity: isLit ? 1 : 0.5,
              }}
            />
          );
        })}
      </div>

      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ left: `${markerPercent}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span
            className="text-[10px] font-mono font-bold leading-none rounded-md px-1.5 py-[3px] mb-1"
            style={{
              background: 'var(--card)',
              color: markerColor,
              boxShadow: `inset 0 0 0 1px ${isTalking ? 'var(--success-muted)' : 'var(--accent-border)'}`,
            }}
          >
            {threshold}%
          </span>
          <span
            className="w-3 h-2 rounded-[3px]"
            style={{ background: markerColor }}
          />
        </div>
        <div
          className="absolute top-6 bottom-1 left-1/2 -translate-x-1/2 w-[2px] rounded-full"
          style={{ background: markerColor, opacity: 0.9 }}
        />
      </div>
    </div>
  );
});

interface ImageTileProps {
  label: string;
  src: string;
  fileName: string;
  onUrlChange: (url: string) => void;
  onFileChange: (file: File) => void;
}

function ImageTile({ label, src, fileName, onUrlChange, onFileChange }: ImageTileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLocalFile = src.startsWith('data:');

  return (
    <div className="space-y-2.5 min-w-0">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="group relative w-full aspect-[4/3] rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all duration-200 hover:border-[var(--accent-border)] hover:shadow-[0_0_24px_var(--accent-muted)] cursor-pointer"
      >
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="absolute inset-0 w-full h-full object-contain p-3" />
        )}
        <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 text-[var(--accent)]">
          <UploadIcon className="w-5 h-5" />
          <span className="text-[11px] font-medium">Subir imagen</span>
        </span>
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-black/60 text-[var(--text-secondary)]">
          {label}
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onFileChange(file);
          event.currentTarget.value = '';
        }}
      />

      <input
        type="url"
        value={isLocalFile ? '' : src}
        placeholder={fileName || 'https://ejemplo.com/avatar.png'}
        onChange={(event) => onUrlChange(event.target.value)}
        className="amoled-input text-xs"
      />
    </div>
  );
}

interface AvatarPreviewProps {
  idleImg: string;
  activeImg: string;
  isTalking: boolean;
}

function AvatarPreview({ idleImg, activeImg, isTalking }: AvatarPreviewProps) {
  return (
    <div
      className={`relative w-full aspect-square rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300 ${
        isTalking
          ? 'shadow-[0_0_48px_var(--accent-muted)] ring-2 ring-[var(--accent-border)]'
          : 'ring-1 ring-[var(--border)]'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 35%, rgba(255,154,92,0.08) 0%, transparent 60%), linear-gradient(160deg, var(--elevated) 0%, var(--background) 100%)',
      }}
    >
      <Image
        src={idleImg}
        alt="Preview Idle"
        fill
        unoptimized
        className={`object-contain p-8 transition-all duration-200 ${
          isTalking ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      />
      <Image
        src={activeImg}
        alt="Preview Active"
        fill
        unoptimized
        className={`object-contain p-8 transition-all duration-200 ${
          isTalking ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      />
    </div>
  );
}

export default function AvatarConfigPage() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [settings, setSettings] = useState<AvatarSettings>(readAvatarSettings);
  const [avatarThreshold, setAvatarThreshold] = useState<number>(
    AVATAR_DEFAULTS.THRESHOLD,
  );
  const [isTalking, setIsTalking] = useState(false);
  const [idleImg, setIdleImg] = useState<string>(AVATAR_DEFAULTS.IDLE_IMAGE);
  const [activeImg, setActiveImg] = useState<string>(AVATAR_DEFAULTS.ACTIVE_IMAGE);

  useEffect(() => {
    const savedSettings = readAvatarSettings();
    setSettings(savedSettings);
    void persistAvatarSettingsForOverlay(savedSettings);
    setAvatarThreshold(readAvatarThreshold());
    setIdleImg(readAvatarImage('idle'));
    setActiveImg(readAvatarImage('active'));

    async function loadMicrophones() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices
          .filter((device) => device.kind === 'audioinput')
          .map((device) => ({
            deviceId: device.deviceId,
            label:
              device.label ||
              `Micrófono Desconocido (${device.deviceId.slice(0, 5)})`,
          }));

        setDevices(audioInputs);
        setSelectedDevice(
          savedSettings.micId &&
            audioInputs.some((device) => device.deviceId === savedSettings.micId)
            ? savedSettings.micId
            : audioInputs[0]?.deviceId || '',
        );
      } catch (err) {
        console.error('Error listando dispositivos de audio:', err);
      }
    }

    void loadMicrophones();
  }, []);

  useEffect(() => {
    const handleAvatarState = (event: Event) => {
      const { isTalking: talking } = (
        event as CustomEvent<AvatarStateDetail>
      ).detail;
      setIsTalking(talking);
    };

    setIsTalking(window.currentAvatarTalking ?? false);
    window.addEventListener(AVATAR_EVENTS.STATE_CHANGE, handleAvatarState);

    return () => {
      window.removeEventListener(AVATAR_EVENTS.STATE_CHANGE, handleAvatarState);
    };
  }, []);

  const handleMicChange = (id: string) => {
    setSelectedDevice(id);
    const nextSettings = updateAvatarSettings({ micId: id });
    setSettings(nextSettings);
    void persistAvatarSettingsForOverlay(nextSettings);
    window.dispatchEvent(new Event(AVATAR_EVENTS.RELOAD_MIC));
  };

  const handleThresholdChange = useCallback((value: number) => {
    setAvatarThreshold(value);
    const nextSettings = updateAvatarSettings({ threshold: value });
    setSettings(nextSettings);
    void persistAvatarSettingsForOverlay(nextSettings);
  }, []);

  const handleImgChange = (type: 'idle' | 'active', url: string) => {
    const updates =
      type === 'idle'
        ? { idleImage: url, idleImageName: '' }
        : { activeImage: url, activeImageName: '' };
    const nextSettings = updateAvatarSettings(updates);
    setSettings(nextSettings);
    void persistAvatarSettingsForOverlay(nextSettings);
    if (type === 'idle') {
      setIdleImg(url);
    } else {
      setActiveImg(url);
    }
  };

  const handleImageFileChange = (type: 'idle' | 'active', file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl !== 'string') return;

      const savedImage = await window.electron?.saveAvatarImage(
        file.name,
        dataUrl,
      );
      const imageUrl = savedImage?.url || dataUrl;
      const imageName = savedImage?.fileName || file.name;
      const updates =
        type === 'idle'
          ? { idleImage: imageUrl, idleImageName: imageName }
          : { activeImage: imageUrl, activeImageName: imageName };
      const nextSettings = updateAvatarSettings(updates);
      setSettings(nextSettings);
      await persistAvatarSettingsForOverlay(nextSettings);

      if (type === 'idle') {
        setIdleImg(imageUrl);
      } else {
        setActiveImg(imageUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full overflow-y-auto rawen-scrollbar">
      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <SectionHeading icon={<ActivityIcon className="h-4 w-4" />} title="Vista Previa" />
            <button
              type="button"
              onClick={() => sendAvatarTalkingState(isTalking)}
              title="Reenviar estado actual"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${
                isTalking
                  ? 'bg-[var(--success-muted)] text-[var(--success)]'
                  : 'bg-[var(--elevated)] text-[var(--text-secondary)]'
              }`}
            >
              {isTalking ? (
                <PlayCircleIcon className="w-3.5 h-3.5" />
              ) : (
                <PauseCircleIcon className="w-3.5 h-3.5" />
              )}
              {isTalking ? 'Hablando' : 'Silencio'}
            </button>
          </div>

          <AvatarPreview idleImg={idleImg} activeImg={activeImg} isTalking={isTalking} />
        </Card>

        <Card className="p-6 space-y-5">
          <SectionHeading icon={<MicIcon className="h-4 w-4" />} title="Fuente de Audio" />

          <Field label="Micrófono" hint="Se usa para detectar tu voz">
            <Dropdown
              options={devices.map((device) => ({
                value: device.deviceId,
                label: device.label || "Micrófono",
              }))}
              value={selectedDevice}
              onChange={handleMicChange}
            />
          </Field>

          <Field
            label="Nivel del micrófono"
            hint="Arrastrá sobre el medidor para mover el umbral"
          >
            <VolumeMeter
              threshold={avatarThreshold}
              isTalking={isTalking}
              onThresholdChange={handleThresholdChange}
            />
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Cuando el nivel llega a la marca, el avatar pasa a la imagen de
              hablando. Segmentos <span className="text-[var(--success)] font-medium">verdes</span> =
              por encima del umbral.
            </p>
          </Field>
        </Card>

        <Card className="p-6 space-y-5 lg:col-span-2">
          <SectionHeading icon={<ImageIcon className="h-4 w-4" />} title="Imágenes del Avatar" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageTile
              label="Idle"
              src={idleImg}
              fileName={settings.idleImageName}
              onUrlChange={(url) => handleImgChange('idle', url)}
              onFileChange={(file) => handleImageFileChange('idle', file)}
            />
            <ImageTile
              label="Hablando"
              src={activeImg}
              fileName={settings.activeImageName}
              onUrlChange={(url) => handleImgChange('active', url)}
              onFileChange={(file) => handleImageFileChange('active', file)}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

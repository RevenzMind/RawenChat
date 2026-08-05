"use client";

import Dropdown from "../Dropdown";

interface DevicesTabProps {
  cameras: MediaDeviceInfo[];
  mics: MediaDeviceInfo[];
  cameraId: string;
  micId: string;
  onCameraChange: (id: string) => void;
  onMicChange: (id: string) => void;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
        {children}
      </span>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      {children}
    </div>
  );
}

export function DevicesTab({
  cameras,
  mics,
  cameraId,
  micId,
  onCameraChange,
  onMicChange,
}: DevicesTabProps) {
  return (
    <div className="space-y-6">
      <SectionTitle>Dispositivos de entrada</SectionTitle>
      <Field label="Cámara">
        <Dropdown
          options={[
            { value: "", label: "Cámara por defecto" },
            ...cameras.map((c, i) => ({ value: c.deviceId, label: c.label || `Cámara ${i + 1}` })),
          ]}
          value={cameraId}
          onChange={onCameraChange}
          placeholder="Cámara por defecto"
        />
      </Field>
      <Field label="Micrófono (avatar)">
        <Dropdown
          options={[
            { value: "", label: "Micrófono por defecto" },
            ...mics.map((m, i) => ({ value: m.deviceId, label: m.label || `Micrófono ${i + 1}` })),
          ]}
          value={micId}
          onChange={onMicChange}
          placeholder="Micrófono por defecto"
        />
      </Field>
    </div>
  );
}

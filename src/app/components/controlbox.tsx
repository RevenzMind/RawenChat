"use client";
import {
  Subtract20Regular,
  Square20Regular,
  Dismiss20Regular,
} from "@fluentui/react-icons";
import { useEffect, useState } from "react";

export default function ControlBox() {
  const [hasElectron, setHasElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electron) {
      setHasElectron(true);
    }
  }, []);

  if (!hasElectron) {
    return <></>;
  }

  const handleMinimize = async () => {
    if (window.electron) {
      await window.electron.minimize();
    }
  };

  const handleMaximize = async () => {
    if (window.electron) {
      await window.electron.maximize();
    }
  };

  const handleClose = async () => {
    if (window.electron) {
      await window.electron.close();
    }
  };

  const btnBase =
    "w-9 h-8 flex items-center justify-center rounded-md transition-colors duration-150 cursor-pointer";

  return (
    <div className="flex items-center gap-0.5 select-none -mr-2">
      <button
        onClick={handleMinimize}
        className={`${btnBase} text-[var(--text-secondary)] hover:text-white hover:bg-white/10`}
        title="Minimizar"
      >
        <Subtract20Regular className="w-4 h-4" />
      </button>
      <button
        onClick={handleMaximize}
        className={`${btnBase} text-[var(--text-secondary)] hover:text-white hover:bg-white/10`}
        title="Maximizar"
      >
        <Square20Regular className="w-[14px] h-[14px]" />
      </button>
      <button
        onClick={handleClose}
        className={`${btnBase} group text-[var(--text-secondary)] hover:text-white hover:bg-[var(--error)]`}
        title="Cerrar"
      >
        <Dismiss20Regular className="w-4 h-4 transition-colors group-hover:text-white" />
      </button>
    </div>
  );
}

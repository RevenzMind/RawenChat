"use client";

import { useState } from "react";
import { resetAppConfig } from "@/config/configManager";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";

interface ResetConfigButtonProps {
  onResetComplete?: () => void;
}

export function ResetConfigButton({ onResetComplete }: ResetConfigButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = () => {
    resetAppConfig();
    setShowConfirm(false);
    onResetComplete?.();
  };

  return (
    <>
      <div className="pt-4 border-t border-[var(--border)] mt-6">
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs font-medium transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Restablecer Configuración
        </button>
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="Restablecer Configuración"
          message="¿Estás seguro de que deseas restablecer todos los ajustes a sus valores por defecto? Esta acción no se puede deshacer."
          confirmLabel="Restablecer todo"
          danger
          onConfirm={handleReset}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

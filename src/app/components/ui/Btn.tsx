import type { ReactNode } from "react";
import { Button } from "./Button";

// Botón compacto del editor de overlays
export function Btn({ children, onClick, danger = false, full = false, accent = false }: {
  children: ReactNode; onClick?: () => void; danger?: boolean; full?: boolean; accent?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={accent ? "accent" : "ghost"}
      size="sm"
      danger={danger}
      full={full}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

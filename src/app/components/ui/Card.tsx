import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`amoled-card p-5 ${className}`.trim()} {...props} />;
}

import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "accent" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  danger?: boolean;
  full?: boolean;
}

export function Button({
  variant = "accent",
  size = "md",
  danger = false,
  full = false,
  className = "",
  ...props
}: ButtonProps) {
  const classes = [
    variant === "accent" ? "amoled-button" : "amoled-button-ghost",
    danger && variant === "accent" ? "amoled-button-danger" : "",
    danger && variant === "ghost" ? "hover:!border-red-500/30 hover:!text-red-300" : "",
    size === "sm" ? "!px-2 !py-1.5 text-[11px]" : "",
    full ? "w-full" : "",
    className,
  ].filter(Boolean);

  return <button className={classes.join(" ")} {...props} />;
}

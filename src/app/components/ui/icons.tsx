function iconAttrs(className = "h-3.5 w-3.5") {
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

export function IconX({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function IconPencil({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function IconCopy({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconPlus({ className }: { className?: string }) {
  return (
    <svg {...iconAttrs(className)}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

export function IconChevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg {...iconAttrs(className)} className={`${className ?? "h-3.5 w-3.5"} transition-transform duration-200 ${open ? "" : "-rotate-90"}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

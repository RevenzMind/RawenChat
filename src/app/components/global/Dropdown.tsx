"use client";

import { useState, useRef, useEffect } from "react";

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Variante compacta para paneles densos (overlay editor, etc.) */
  compact?: boolean;
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  className = "",
  compact = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-[var(--card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] font-medium transition-colors hover:border-[var(--accent-border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)] outline-none ${
          compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"
        }`}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <svg
          className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} text-[var(--text-secondary)] transition-transform duration-150 shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.45)] overflow-hidden z-50">
          <div className="p-1 space-y-px max-h-56 overflow-y-auto">
            {options.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false); }}
                className={`w-full text-left px-2.5 rounded transition-colors ${
                  compact ? "py-1 text-[11px]" : "py-1.5 text-xs"
                } ${
                  option.value === value
                    ? "bg-[var(--accent-muted)] text-[var(--accent)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--elevated)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

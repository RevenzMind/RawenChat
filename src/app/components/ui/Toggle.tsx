interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      style={{
        width: 40,
        height: 22,
        background: checked ? "var(--accent)" : "var(--border)",
      }}
    >
      <span
        className="absolute top-[3px] rounded-full bg-white shadow-sm transition-all duration-200"
        style={{ width: 16, height: 16, left: checked ? 21 : 3 }}
      />
    </button>
  );
}

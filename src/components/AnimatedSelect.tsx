"use client";

import { useEffect, useId, useRef, useState } from "react";

export type AnimatedSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: AnimatedSelectOption[];
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  "aria-label"?: string;
};

export function AnimatedSelect({
  value,
  onChange,
  options,
  disabled,
  className = "",
  buttonClassName = "",
  "aria-label": ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex h-9 w-full min-w-[7.5rem] items-center justify-between gap-2 rounded-lg border border-card-border bg-card px-2.5 text-left text-sm text-foreground outline-none ring-accent/35 transition-[border-color,box-shadow] duration-200 hover:border-accent/30 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${buttonClassName}`}
      >
        <span className="truncate">{current?.label ?? "—"}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ease-out ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div
        id={listId}
        role="listbox"
        className={`ui-select-panel absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-card-border bg-card py-1 shadow-lg ring-1 ring-black/5 dark:ring-white/10 ${
          open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible pointer-events-none -translate-y-1 scale-[0.98] opacity-0"
        } origin-top transition-[opacity,transform,visibility] duration-200 ease-out`}
      >
        {options.map((opt) => {
          const selected = opt.value === value;
          const inactive = opt.disabled;
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={selected}
              disabled={inactive}
              onClick={() => !inactive && pick(opt.value)}
              className={`flex w-full px-2.5 py-2 text-left text-sm transition-colors duration-150 ${
                selected
                  ? "bg-accent-soft font-medium text-foreground"
                  : "text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
              } ${inactive ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

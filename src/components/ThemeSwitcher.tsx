"use client";

import { AnimatedSelect } from "@/components/AnimatedSelect";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const THEME_OPTIONS = [
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
  { value: "system", label: "시스템" },
];

export function ThemeSwitcher() {
  const mounted = useIsClient();
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <div
        className="h-9 min-w-[7.5rem] rounded-lg border border-accent/20 bg-card"
        aria-hidden
      />
    );
  }

  const value = theme === "dark" || theme === "light" ? theme : "system";

  return (
    <div className="flex min-w-[7.5rem] items-center gap-2 text-sm text-muted">
      <span className="sr-only">테마</span>
      <AnimatedSelect
        aria-label="테마"
        value={value}
        onChange={(v) => setTheme(v)}
        options={THEME_OPTIONS}
        className="min-w-[7.5rem]"
      />
    </div>
  );
}

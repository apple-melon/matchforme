"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function ThemeSwitcher() {
  const mounted = useIsClient();
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <div
        className="h-9 min-w-[7.5rem] rounded-lg border border-card-border bg-card"
        aria-hidden
      />
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="sr-only">테마</span>
      <select
        value={theme === "dark" || theme === "light" ? theme : "system"}
        onChange={(e) => setTheme(e.target.value)}
        className="h-9 min-w-[7.5rem] cursor-pointer rounded-lg border border-card-border bg-card px-2 text-foreground outline-none ring-amber-500/40 transition-[border-color,box-shadow,background-color] duration-200 focus:ring-2"
      >
        <option value="light">라이트</option>
        <option value="dark">다크</option>
        <option value="system">시스템</option>
      </select>
    </label>
  );
}

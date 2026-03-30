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
        className="h-9 min-w-[7.5rem] rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
        aria-hidden
      />
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="sr-only">테마</span>
      <select
        value={theme === "dark" || theme === "light" ? theme : "system"}
        onChange={(e) => setTheme(e.target.value)}
        className="h-9 min-w-[7.5rem] cursor-pointer rounded-lg border border-zinc-300 bg-white px-2 text-zinc-900 outline-none ring-amber-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <option value="light">라이트</option>
        <option value="dark">다크</option>
        <option value="system">시스템</option>
      </select>
    </label>
  );
}

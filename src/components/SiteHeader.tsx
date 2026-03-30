"use client";

import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-background/90 backdrop-blur-md dark:border-zinc-800/80">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="text-sm font-semibold text-zinc-900 hover:text-amber-700 dark:text-zinc-100 dark:hover:text-amber-400"
        >
          대진표
        </Link>
        <ThemeSwitcher />
      </div>
    </header>
  );
}

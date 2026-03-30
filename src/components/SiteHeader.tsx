"use client";

import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-card-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="text-sm font-bold tracking-wide text-foreground hover:text-amber-600 dark:hover:text-amber-400"
        >
          MATCH FOR ME
        </Link>
        <ThemeSwitcher />
      </div>
    </header>
  );
}

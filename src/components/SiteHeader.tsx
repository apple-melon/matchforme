"use client";

import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const j = (await res.json()) as { user: { email: string } | null };
      if (c) return;
      setLoggedIn(Boolean(j.user));
    })();
    return () => {
      c = true;
    };
  }, []);

  return (
    <header className="ui-header-animate sticky top-0 z-40 border-b border-card-border bg-background/95 backdrop-blur-md transition-[border-color,background-color] duration-300">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="text-sm font-bold tracking-wide text-foreground transition-colors duration-200 hover:text-amber-600 dark:hover:text-amber-400"
        >
          MATCH FOR ME
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-3 text-xs sm:text-sm">
          <Link
            href="/create"
            className="text-muted transition-colors duration-200 hover:text-foreground"
          >
            대회 만들기
          </Link>
          <Link
            href="/profile"
            className="text-muted transition-colors duration-200 hover:text-foreground"
          >
            프로필
          </Link>
          {loggedIn ? null : (
            <Link
              href="/login"
              className="font-medium text-amber-600 transition-colors duration-200 hover:text-amber-500 hover:underline"
            >
              로그인
            </Link>
          )}
          <ThemeSwitcher />
        </nav>
      </div>
    </header>
  );
}

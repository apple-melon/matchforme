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
    <header className="ui-header-animate sticky top-0 z-40 border-b border-accent/20 bg-card/90 shadow-[0_1px_0_0_rgba(13,148,136,0.12)] backdrop-blur-md transition-[border-color,background-color,box-shadow] duration-300 dark:border-accent/25 dark:shadow-[0_1px_0_0_rgba(45,212,191,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent dark:via-accent/40" aria-hidden />
      <div className="relative mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-[3.75rem] sm:px-5">
        <Link
          href="/"
          className="group shrink-0 text-sm font-bold tracking-wide text-foreground transition-colors duration-200"
        >
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-accent align-middle transition-transform duration-200 group-hover:scale-110"
            aria-hidden
          />
          <span className="group-hover:text-accent">MATCH FOR ME</span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Link
            href="/create"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-fg shadow-sm transition-[filter,transform,box-shadow] duration-200 hover:brightness-110 active:scale-[0.98] sm:px-4 sm:text-sm"
          >
            대회 만들기
          </Link>
          <Link
            href="/profile"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-accent/35 bg-accent-soft px-3 py-2 text-xs font-semibold text-accent transition-[background-color,border-color,color] duration-200 hover:border-accent/60 hover:bg-accent/15 dark:hover:bg-accent/20 sm:px-4 sm:text-sm"
          >
            프로필
          </Link>
          {loggedIn ? null : (
            <Link
              href="/login"
              className="inline-flex shrink-0 items-center rounded-lg border border-card-border px-2.5 py-2 text-xs font-medium text-foreground transition-colors duration-200 hover:border-accent/40 hover:text-accent sm:px-3 sm:text-sm"
            >
              로그인
            </Link>
          )}
          <div className="flex shrink-0 items-center border-l border-card-border pl-2 sm:pl-3">
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}

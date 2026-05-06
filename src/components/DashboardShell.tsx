"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

type NavItem = {
  key: string;
  label: string;
  icon: ReactNode;
};

function IconBox({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-5 w-5 items-center justify-center">{children}</span>;
}

function SvgIcon({
  d,
  stroke = "currentColor",
}: {
  d: string;
  stroke?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function iconHome() {
  return (
    <SvgIcon d="M3 10.5L12 3l9 7.5V21a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 21V10.5Z" />
  );
}

function iconUsers() {
  return <SvgIcon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />;
}

function iconCalendar() {
  return <SvgIcon d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />;
}

function iconBracket() {
  return (
    <SvgIcon d="M10 7H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3m4-16h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3M10 12h4" />
  );
}

function iconChart() {
  return <SvgIcon d="M3 3v18h18" />;
}

function iconGear() {
  return <SvgIcon d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-1.4 3.4 2 2 0 0 1-1.4-.6l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V22a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8 0 2 2 0 0 1 0-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H2a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V2a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H22a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z" />;
}

function BurgerIcon() {
  return (
    <SvgIcon d="M4 6h16M4 12h16M4 18h16" />
  );
}

export function DashboardShell({
  title,
  subtitle,
  children,
  sidebarItems,
  activeKey,
  showSidebar = true,
  topRight,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  sidebarItems?: NavItem[];
  activeKey?: string;
  showSidebar?: boolean;
  topRight?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const defaultItems = useMemo<NavItem[]>(
    () => [
      { key: "home", label: "홈", icon: <IconBox>{iconHome()}</IconBox> },
      { key: "participants", label: "참가자", icon: <IconBox>{iconUsers()}</IconBox> },
      { key: "schedule", label: "일정", icon: <IconBox>{iconCalendar()}</IconBox> },
      { key: "bracket", label: "대진", icon: <IconBox>{iconBracket()}</IconBox> },
      { key: "records", label: "기록", icon: <IconBox>{iconChart()}</IconBox> },
      { key: "settings", label: "설정", icon: <IconBox>{iconGear()}</IconBox> },
    ],
    [],
  );

  const items = sidebarItems ?? defaultItems;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="flex">
        {showSidebar ? (
          <>
            <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/40 md:flex">
              <div className="flex items-center gap-2 px-5 py-4">
                <div className="h-9 w-9 rounded-xl bg-accent/15 text-accent dark:bg-accent/20 flex items-center justify-center">
                  <span className="font-black text-accent">M</span>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">MATCH FOR ME</div>
                  <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">대회 대시보드</div>
                </div>
              </div>
              <nav className="flex-1 space-y-1 px-3 pb-4">
                {items.map((it) => {
                  const isActive = it.key === activeKey;
                  return (
                    <Link
                      key={it.key}
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className={[
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                        isActive
                          ? "bg-red-500/10 text-red-700 dark:text-red-300"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      <span className={isActive ? "text-red-600 dark:text-red-300" : ""}>{it.icon}</span>
                      <span className="truncate">{it.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="px-5 pb-5">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                  대회 상태를 한눈에 확인하세요.
                </div>
              </div>
            </aside>

            {open ? (
              <div
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
                onClick={() => setOpen(false)}
                aria-hidden
              />
            ) : null}

            {open ? (
              <aside className="fixed left-0 top-0 z-50 h-full w-72 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-accent/15 text-accent dark:bg-accent/20 flex items-center justify-center">
                      <span className="font-black text-accent">M</span>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">MATCH FOR ME</div>
                      <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">대회 대시보드</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200"
                  >
                    닫기
                  </button>
                </div>
                <nav className="space-y-1 px-3 pb-4">
                  {items.map((it) => {
                    const isActive = it.key === activeKey;
                    return (
                      <Link
                        key={it.key}
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className={[
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                          isActive
                            ? "bg-red-500/10 text-red-700 dark:text-red-300"
                            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
                        ].join(" ")}
                      >
                        <span className={isActive ? "text-red-600 dark:text-red-300" : ""}>{it.icon}</span>
                        <span className="truncate">{it.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </aside>
            ) : null}
          </>
        ) : null}

        <div className="flex-1">
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/70 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                {showSidebar ? (
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="inline-flex rounded-lg border border-zinc-200 bg-white p-2 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200 md:hidden"
                    aria-label="메뉴 열기"
                  >
                    {BurgerIcon()}
                  </button>
                ) : null}
                <div className="min-w-0">
                  {subtitle ? (
                    <p className="truncate text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {subtitle}
                    </p>
                  ) : null}
                  <h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {topRight ?? null}
                <div className="hidden sm:block">
                  <ThemeSwitcher />
                </div>
              </div>
            </div>
          </header>
          <div className="w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}


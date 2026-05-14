"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type NavItem = {
  key: string;
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
};

function SvgIcon({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

export const NAV_ICONS = {
  home:         <SvgIcon d="M3 10.5L12 3l9 7.5V21a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 21V10.5Z" />,
  tournament:   <SvgIcon d="M8 21h8M12 17v4M17 3H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />,
  bracket:      <SvgIcon d="M10 7H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3M14 7h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3M10 12h4" />,
  participants: <SvgIcon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" d2="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  schedule:     <SvgIcon d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />,
  records:      <SvgIcon d="M3 3v18h18M8 17V11M12 17V8M16 17v-5" />,
  settings:     <SvgIcon d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V22a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H2a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V2a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H22a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z" />,
  bell:         <SvgIcon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />,
  menu:         <SvgIcon d="M4 6h16M4 12h16M4 18h16" />,
  logout:       <SvgIcon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  user:         <SvgIcon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" d2="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  plus:         <SvgIcon d="M12 5v14M5 12h14" />,
};

export const DEFAULT_NAV: NavItem[] = [
  { key: "home",         label: "홈",     icon: NAV_ICONS.home,         href: "/" },
  { key: "tournament",   label: "토너먼트", icon: NAV_ICONS.tournament,   href: "/my" },
  { key: "bracket",      label: "대진표",  icon: NAV_ICONS.bracket,      href: "/my" },
  { key: "participants", label: "참가팀",  icon: NAV_ICONS.participants,  href: "/my" },
  { key: "schedule",     label: "일정",    icon: NAV_ICONS.schedule,     href: "/my" },
  { key: "records",      label: "기록",    icon: NAV_ICONS.records,      href: "/my" },
  { key: "settings",     label: "설정",    icon: NAV_ICONS.settings,     href: "/my" },
];

function GanginLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="#dc2626" />
      <path d="M10 14h10M10 18h7M10 22h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M22 12l4 6-4 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProfileDropdown({
  user,
  initials,
  onLogout,
}: {
  user: { name: string | null; email: string };
  initials: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 transition"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shrink-0">
          {initials}
        </div>
        <span className="hidden max-w-[8rem] truncate text-xs font-medium text-zinc-700 dark:text-zinc-300 sm:block">
          {user.name ?? user.email}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {/* User info */}
          <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {user.name ?? "사용자"}
              </p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>

          {/* Menu items */}
          <div className="px-2 py-2">
            <Link
              href="/my"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
            >
              {NAV_ICONS.tournament}
              내 토너먼트
            </Link>
            <Link
              href="/create"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
            >
              {NAV_ICONS.plus}
              대회 만들기
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-zinc-100 px-2 py-2 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => { setOpen(false); onLogout(); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition"
            >
              {NAV_ICONS.logout}
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardShell({
  title,
  subtitle,
  breadcrumb,
  children,
  sidebarItems,
  activeKey,
  showSidebar = true,
  topRight,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; href?: string }[];
  children: ReactNode;
  sidebarItems?: NavItem[];
  activeKey?: string;
  showSidebar?: boolean;
  topRight?: ReactNode;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string | null; email: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { user: { name: string | null; email: string } | null }) => {
        if (!cancelled) setUser(j.user ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
    router.refresh();
  }

  const items = sidebarItems ?? DEFAULT_NAV;

  const initials = user?.name
    ? user.name.slice(0, 1).toUpperCase()
    : user?.email?.slice(0, 1).toUpperCase() ?? "?";

  function NavList({ onClose }: { onClose?: () => void }) {
    return (
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {items.map((it) => {
          const isActive = it.key === activeKey;

          if (it.onClick) {
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => { it.onClick!(); onClose?.(); }}
                className={[
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                ].join(" ")}
              >
                <span className={isActive ? "text-red-600 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500"}>
                  {it.icon}
                </span>
                <span className="truncate">{it.label}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500" />}
              </button>
            );
          }

          return (
            <Link
              key={it.key}
              href={it.href ?? "/"}
              onClick={() => onClose?.()}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
              ].join(" ")}
            >
              <span className={isActive ? "text-red-600 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500"}>
                {it.icon}
              </span>
              <span className="truncate">{it.label}</span>
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500" />}
            </Link>
          );
        })}
      </nav>
    );
  }

  function SidebarContent({ onClose }: { onClose?: () => void }) {
    return (
      <div className="flex h-full flex-col">
        {/* Brand — 클릭하면 홈으로 */}
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40 transition"
        >
          <GanginLogo size={36} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">강인 매치</div>
            <div className="text-[11px] text-zinc-400">대회 관리 플랫폼</div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onClose(); }}
              className="ml-auto rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </Link>

        {/* Nav items */}
        <NavList onClose={onClose} />

        {/* User section at bottom */}
        {user ? (
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-3 py-3">
            <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                  {user.name ?? "사용자"}
                </p>
                <p className="truncate text-[10px] text-zinc-400">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                title="로그아웃"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400 transition"
              >
                {NAV_ICONS.logout}
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
            <Link
              href="/login"
              className="block w-full rounded-xl bg-red-600 py-2 text-center text-sm font-semibold text-white hover:bg-red-500 transition"
            >
              로그인
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="flex min-h-screen">

        {/* Desktop sidebar */}
        {showSidebar && (
          <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex md:flex-col">
            <SidebarContent />
          </aside>
        )}

        {/* Mobile sidebar overlay */}
        {showSidebar && mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <aside className="fixed left-0 top-0 z-50 h-full w-72 overflow-y-auto border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </aside>
          </>
        )}

        {/* Main area */}
        <div className="flex flex-1 flex-col">

          {/* Top header */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile menu button */}
              {showSidebar && (
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 md:hidden"
                  aria-label="메뉴 열기"
                >
                  {NAV_ICONS.menu}
                </button>
              )}

              {/* Breadcrumb / Title */}
              <div className="min-w-0">
                {breadcrumb && breadcrumb.length > 0 ? (
                  <nav className="flex items-center gap-1 text-xs text-zinc-400 mb-0.5">
                    {breadcrumb.map((b, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span>›</span>}
                        {b.href ? (
                          <Link href={b.href} className="hover:text-zinc-600 dark:hover:text-zinc-300 transition">
                            {b.label}
                          </Link>
                        ) : (
                          <span className="text-zinc-600 dark:text-zinc-300 font-medium">{b.label}</span>
                        )}
                      </span>
                    ))}
                  </nav>
                ) : subtitle ? (
                  <p className="truncate text-xs font-medium text-zinc-400 dark:text-zinc-500">{subtitle}</p>
                ) : null}
                <h1 className="truncate text-lg font-bold text-zinc-900 dark:text-zinc-50 sm:text-xl">{title}</h1>
              </div>
            </div>

            {/* Header right */}
            <div className="flex items-center gap-2">
              {topRight ?? null}

              {/* Bell */}
              <button
                type="button"
                className="relative rounded-xl border border-zinc-200 bg-white p-2 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
                aria-label="알림"
              >
                {NAV_ICONS.bell}
              </button>

              {/* Profile dropdown */}
              {user ? (
                <ProfileDropdown user={user} initials={initials} onLogout={() => void logout()} />
              ) : (
                <Link
                  href="/login"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-red-300 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 transition"
                >
                  로그인
                </Link>
              )}
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1">
            {children}
          </main>

        </div>
      </div>
    </div>
  );
}

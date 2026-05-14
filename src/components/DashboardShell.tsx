"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 shrink-0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

export const NAV_ICONS = {
  home:       <SvgIcon d="M3 10.5L12 3l9 7.5V21a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 21V10.5Z" />,
  tournament: <SvgIcon d="M8 21h8M12 17v4M17 3H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />,
  bracket:    <SvgIcon d="M10 7H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3M14 7h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3M10 12h4" />,
  participants:<SvgIcon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" d2="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  records:    <SvgIcon d="M3 3v18h18M8 17V11M12 17V8M16 17v-5" />,
  settings:   <SvgIcon d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V22a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H2a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V2a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H22a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z" />,
  bell:       <SvgIcon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />,
  menu:       <SvgIcon d="M4 6h16M4 12h16M4 18h16" />,
  logout:     <SvgIcon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  plus:       <SvgIcon d="M12 5v14M5 12h14" />,
  chevronLeft:<SvgIcon d="M15 18l-6-6 6-6" />,
  chevronRight:<SvgIcon d="M9 18l6-6-6-6" />,
  close:      <SvgIcon d="M18 6 6 18M6 6l12 12" />,
  check:      <SvgIcon d="M20 6 9 17l-5-5" />,
};

export const DEFAULT_NAV: NavItem[] = [
  { key: "home",       label: "홈",     icon: NAV_ICONS.home,       href: "/" },
  { key: "tournament", label: "토너먼트", icon: NAV_ICONS.tournament, href: "/my" },
];

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function typeIcon(type: string) {
  if (type === "PARTICIPANT_JOINED") return "👥";
  if (type === "TOURNAMENT_STARTED") return "🚀";
  if (type === "TOURNAMENT_ENDED") return "🏆";
  return "🔔";
}

function NotificationBell({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const j = (await res.json()) as { notifications: NotificationItem[]; unreadCount: number };
      setNotifications(j.notifications);
      setUnread(j.unreadCount);
    } catch {}
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const tmr = setInterval(() => void fetchNotifications(), 30000);
    return () => clearInterval(tmr);
  }, [fetchNotifications]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", credentials: "include" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); if (!open) void fetchNotifications(); }}
        title="알림"
        className={[
          "relative flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition",
          collapsed ? "h-10 w-10" : "h-10 w-10",
        ].join(" ")}
      >
        {NAV_ICONS.bell}
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
              알림
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>
              )}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 transition"
              >
                {NAV_ICONS.check}
                전체 읽음
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-sm text-zinc-400">
                <span className="mb-2 text-2xl">🔔</span>
                아직 알림이 없습니다
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={[
                    "flex gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition border-b border-zinc-50 dark:border-zinc-800/50 last:border-0",
                    !n.read ? "bg-red-50/60 dark:bg-red-950/10" : "",
                  ].join(" ")}
                  onClick={() => {
                    setOpen(false);
                    if (n.link) router.push(n.link);
                  }}
                >
                  <span className="mt-0.5 text-lg shrink-0">{typeIcon(n.type)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold truncate ${!n.read ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-300"}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{n.body}</p>
                    <p className="mt-1 text-[10px] text-zinc-400">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileDropdown({
  user,
  initials,
  onLogout,
  collapsed,
}: {
  user: { name: string | null; email: string };
  initials: string;
  onLogout: () => void;
  collapsed: boolean;
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
        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 transition"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shrink-0">
          {initials}
        </div>
        {!collapsed && (
          <>
            <span className="hidden max-w-[7rem] truncate text-xs font-medium text-zinc-700 dark:text-zinc-300 sm:block">
              {user.name ?? user.email}
            </span>
            <svg viewBox="0 0 24 24" fill="none" className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{user.name ?? "사용자"}</p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>
          <div className="px-2 py-2">
            <Link href="/my" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition">
              {NAV_ICONS.tournament}내 토너먼트
            </Link>
            <Link href="/create" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition">
              {NAV_ICONS.plus}대회 만들기
            </Link>
          </div>
          <div className="border-t border-zinc-100 px-2 py-2 dark:border-zinc-800">
            <button type="button" onClick={() => { setOpen(false); onLogout(); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition">
              {NAV_ICONS.logout}로그아웃
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
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{ name: string | null; email: string } | null>(null);

  // 사이드바 접힘 상태 localStorage 복원
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggleCollapse() {
    setCollapsed((v) => {
      localStorage.setItem("sidebar_collapsed", String(!v));
      return !v;
    });
  }

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
      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {items.map((it) => {
          const isActive = it.key === activeKey;
          const baseClass = [
            "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
            collapsed ? "justify-center" : "gap-3",
            isActive
              ? "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
          ].join(" ");

          const iconEl = (
            <span className={`shrink-0 ${isActive ? "text-red-600 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500"}`}>
              {it.icon}
            </span>
          );

          const inner = (
            <>
              {iconEl}
              {!collapsed && <span className="truncate flex-1">{it.label}</span>}
              {!collapsed && isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500" />}
            </>
          );

          if (it.onClick) {
            return (
              <button key={it.key} type="button" title={collapsed ? it.label : undefined}
                onClick={() => { it.onClick!(); onClose?.(); }}
                className={`w-full ${baseClass}`}
              >
                {inner}
              </button>
            );
          }
          return (
            <Link key={it.key} href={it.href ?? "/"} title={collapsed ? it.label : undefined}
              onClick={() => onClose?.()}
              className={baseClass}
            >
              {inner}
            </Link>
          );
        })}
      </nav>
    );
  }

  function SidebarContent({ onClose }: { onClose?: () => void }) {
    return (
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div className={`flex items-center border-b border-zinc-100 dark:border-zinc-800 ${collapsed ? "justify-center px-3 py-4" : "gap-3 px-4 py-4"}`}>
          <Link href="/" onClick={onClose} title="강인 매치 홈" className="flex shrink-0 items-center justify-center rounded-xl hover:opacity-80 transition">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="10" fill="#dc2626" />
              <path d="M10 14h10M10 18h7M10 22h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M22 12l4 6-4 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">강인 매치</div>
              <div className="text-[11px] text-zinc-400">대회 관리 플랫폼</div>
            </div>
          )}
          {/* 모바일 닫기 버튼 */}
          {onClose && !collapsed && (
            <button type="button" onClick={onClose}
              className="ml-auto shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden"
            >
              {NAV_ICONS.close}
            </button>
          )}
        </div>

        {/* Nav */}
        <NavList onClose={onClose} />

        {/* 사이드바 접기 버튼 */}
        <div className={`border-t border-zinc-100 dark:border-zinc-800 px-2 py-2 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            type="button"
            onClick={toggleCollapse}
            title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition w-full"
          >
            <span className="shrink-0">{collapsed ? NAV_ICONS.chevronRight : NAV_ICONS.chevronLeft}</span>
            {!collapsed && <span>사이드바 접기</span>}
          </button>
        </div>

        {/* 사용자 정보 */}
        {user ? (
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-2 py-3">
            {collapsed ? (
              <div className="flex justify-center">
                <button type="button" onClick={() => void logout()} title="로그아웃"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white hover:bg-red-600 transition"
                >
                  {initials}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">{user.name ?? "사용자"}</p>
                  <p className="truncate text-[10px] text-zinc-400">{user.email}</p>
                </div>
                <button type="button" onClick={() => void logout()} title="로그아웃"
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400 transition"
                >
                  {NAV_ICONS.logout}
                </button>
              </div>
            )}
          </div>
        ) : (
          !collapsed && (
            <div className="border-t border-zinc-100 dark:border-zinc-800 px-3 py-3">
              <Link href="/login" className="block w-full rounded-xl bg-red-600 py-2 text-center text-sm font-semibold text-white hover:bg-red-500 transition">
                로그인
              </Link>
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="flex min-h-screen">

        {/* Desktop sidebar */}
        {showSidebar && (
          <aside
            className={[
              "hidden shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex md:flex-col",
              "transition-all duration-300 ease-in-out",
              collapsed ? "w-[68px]" : "w-64",
            ].join(" ")}
          >
            <SidebarContent />
          </aside>
        )}

        {/* Mobile sidebar overlay */}
        {showSidebar && mobileOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
            <aside className="fixed left-0 top-0 z-50 h-full w-64 overflow-y-auto border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </aside>
          </>
        )}

        {/* Main */}
        <div className="flex flex-1 flex-col min-w-0">

          {/* Top header */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {showSidebar && (
                <button type="button" onClick={() => setMobileOpen(true)}
                  className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 md:hidden"
                  aria-label="메뉴 열기"
                >
                  {NAV_ICONS.menu}
                </button>
              )}
              <div className="min-w-0">
                {breadcrumb && breadcrumb.length > 0 ? (
                  <nav className="flex items-center gap-1 text-xs text-zinc-400 mb-0.5">
                    {breadcrumb.map((b, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span>›</span>}
                        {b.href
                          ? <Link href={b.href} className="hover:text-zinc-600 dark:hover:text-zinc-300 transition">{b.label}</Link>
                          : <span className="text-zinc-600 dark:text-zinc-300 font-medium">{b.label}</span>}
                      </span>
                    ))}
                  </nav>
                ) : subtitle ? (
                  <p className="truncate text-xs font-medium text-zinc-400 dark:text-zinc-500">{subtitle}</p>
                ) : null}
                <h1 className="truncate text-lg font-bold text-zinc-900 dark:text-zinc-50 sm:text-xl">{title}</h1>
              </div>
            </div>

            {/* 헤더 우측 */}
            <div className="flex items-center gap-2 shrink-0">
              {topRight ?? null}
              <NotificationBell collapsed={false} />
              {user ? (
                <ProfileDropdown user={user} initials={initials} onLogout={() => void logout()} collapsed={false} />
              ) : (
                <Link href="/login" className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-red-300 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 transition">
                  로그인
                </Link>
              )}
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

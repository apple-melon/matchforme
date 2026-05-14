"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";

type Hosted = {
  id: string;
  code: string;
  title: string;
  createdAt: string;
  participantCount: number;
  startedAt?: string | null;
  endedAt?: string | null;
};

function StatusBadge({ startedAt, endedAt }: { startedAt?: string | null; endedAt?: string | null }) {
  if (endedAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        종료
      </span>
    );
  }
  if (startedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        진행 중
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      대기 중
    </span>
  );
}

function TournamentIcon({ started, ended }: { started: boolean; ended: boolean }) {
  if (ended) return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-zinc-400" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8M12 17v4M17 3H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
      </svg>
    </div>
  );
  if (started) return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/40">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-red-500" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </div>
  );
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-zinc-500" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8M12 17v4M17 3H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
      </svg>
    </div>
  );
}

function AuthDashboard() {
  const [hosted, setHosted] = useState<Hosted[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tournaments/my", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { tournaments?: Hosted[] }) => {
        if (!cancelled) {
          setHosted(j.tournaments ?? []);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function goJoin() {
    const d = code.replace(/\D/g, "");
    if (d.length !== 6) { setCodeErr("6자리 숫자 코드를 입력해 주세요."); return; }
    setCodeErr(null);
    router.push(`/join/${d}`);
  }

  const live = hosted.filter((t) => t.startedAt && !t.endedAt);
  const others = hosted.filter((t) => !t.startedAt || t.endedAt);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">홈</h2>
      <p className="mt-0.5 text-sm text-zinc-500">대회를 만들거나 참가 코드로 입장하세요.</p>

      {/* Live tournament highlight */}
      {live.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">진행 중인 토너먼트</p>
          {live.map((t) => (
            <Link
              key={t.id}
              href={`/manage/${t.id}`}
              className="group block rounded-2xl bg-gradient-to-r from-red-600 to-red-500 p-5 text-white shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white/70 uppercase tracking-wide">{t.code}</p>
                  <h3 className="mt-1 text-lg font-bold leading-snug">{t.title || "무제 대회"}</h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-white/80">
                    <span className="flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      {t.participantCount}팀 참가
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      진행 중
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-xl border border-white/25 bg-white/15 px-3 py-1.5 text-sm font-semibold text-white group-hover:bg-white/25 transition">
                  대진표 보기 →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Join */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">대회 참가하기</p>
          <p className="mt-1 text-xs text-zinc-500">6자리 코드로 입장</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="예: 482913"
            inputMode="numeric"
            maxLength={6}
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-center font-mono text-xl tracking-[0.3em] text-zinc-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 transition"
          />
          {codeErr && <p className="mt-1.5 text-xs text-red-500">{codeErr}</p>}
          <button
            type="button"
            onClick={goJoin}
            className="mt-3 w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 active:scale-[0.98] transition"
          >
            참가 페이지로 이동
          </button>
        </div>

        {/* Create */}
        <Link
          href="/create"
          className="group flex flex-col rounded-2xl border border-dashed border-zinc-300 bg-white p-5 hover:border-red-400 hover:bg-red-50/30 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-red-600 dark:hover:bg-red-950/10 transition"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600 group-hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 transition">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">새 대회 만들기</p>
          <p className="mt-1 text-xs text-zinc-500">6자리 코드 발급 · 대진 관리</p>
        </Link>
      </div>

      {/* My tournaments table */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">내 토너먼트</p>
          <Link href="/my" className="text-xs text-red-600 hover:text-red-500 dark:text-red-400 transition">
            전체 보기 →
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-400">불러오는 중…</div>
          ) : hosted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-zinc-400">
              <svg viewBox="0 0 24 24" fill="none" className="mb-3 h-10 w-10 text-zinc-300" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M8 21h8M12 17v4M17 3H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
              </svg>
              아직 만든 대회가 없습니다.
              <Link href="/create" className="mt-3 text-red-600 underline text-xs">대회 만들기</Link>
            </div>
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">토너먼트 이름</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">참가팀</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">진행 상태</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">코드</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {hosted.map((t) => (
                      <tr key={t.id} className="border-b border-zinc-50 hover:bg-zinc-50/80 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <TournamentIcon started={Boolean(t.startedAt)} ended={Boolean(t.endedAt)} />
                            <span className="font-medium text-zinc-800 dark:text-zinc-100">{t.title || "무제 대회"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{t.participantCount}팀</td>
                        <td className="px-4 py-3">
                          <StatusBadge startedAt={t.startedAt} endedAt={t.endedAt} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500">{t.code}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/manage/${t.id}`} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition">
                              운영
                            </Link>
                            <Link href={`/t/${t.code}`} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 transition">
                              진행 보기
                            </Link>
                            <button type="button" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {hosted.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <TournamentIcon started={Boolean(t.startedAt)} ended={Boolean(t.endedAt)} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-800 dark:text-zinc-100 truncate">{t.title || "무제 대회"}</p>
                      <p className="text-xs text-zinc-500">{t.participantCount}팀 · 코드 {t.code}</p>
                    </div>
                    <StatusBadge startedAt={t.startedAt} endedAt={t.endedAt} />
                    <Link href={`/manage/${t.id}`} className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white">운영</Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GuestHome() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function goJoin() {
    const d = code.replace(/\D/g, "");
    if (d.length !== 6) { setErr("6자리 숫자 코드를 입력해 주세요."); return; }
    setErr(null);
    router.push(`/join/${d}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-500 to-red-700 px-4 py-20 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-48 w-48 rounded-full bg-white blur-2xl" />
        </div>
        <div className="relative mx-auto max-w-lg text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <svg width="44" height="44" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="rgba(255,255,255,0.2)" />
              <path d="M10 14h10M10 18h7M10 22h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M22 12l4 6-4 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h1 className="text-3xl font-extrabold tracking-tight">강인 매치</h1>
          </div>
          <p className="text-base text-white/80 leading-relaxed">
            대회를 만들고 6자리 코드로 팀을 모아<br />
            토너먼트·리그 대진표를 실시간으로 관리하세요
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-red-600 hover:bg-red-50 active:scale-[0.98] transition shadow-sm"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="rounded-2xl border-2 border-white/50 px-6 py-3 text-sm font-bold text-white hover:border-white hover:bg-white/10 active:scale-[0.98] transition"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>

      {/* Join section */}
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">대회 참가하기</h2>
          <p className="mt-1 text-sm text-zinc-500">주최자가 알려준 6자리 코드를 입력하세요.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="예: 482913"
            inputMode="numeric"
            maxLength={6}
            className="mt-4 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-center font-mono text-2xl tracking-[0.3em] text-zinc-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 transition"
          />
          {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
          <button
            type="button"
            onClick={goJoin}
            className="mt-4 w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-500 active:scale-[0.98] transition"
          >
            참가 페이지로 이동
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-zinc-400">
          진행 상황만 보려면 <span className="font-mono text-zinc-600 dark:text-zinc-300">/t/여섯자리숫자</span>로 접속
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [authState, setAuthState] = useState<"loading" | "auth" | "guest">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { user: unknown }) => {
        if (!cancelled) setAuthState(j.user ? "auth" : "guest");
      })
      .catch(() => { if (!cancelled) setAuthState("guest"); });
    return () => { cancelled = true; };
  }, []);

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (authState === "guest") {
    return <GuestHome />;
  }

  return (
    <DashboardShell
      title="홈"
      breadcrumb={[{ label: "강인 매치" }, { label: "홈" }]}
      activeKey="home"
    >
      <AuthDashboard />
    </DashboardShell>
  );
}

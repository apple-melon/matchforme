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

type Participation = {
  participantId: string;
  name: string;
  affiliation: string;
  tournament: {
    id: string;
    code: string;
    title: string;
    format: string;
    hasBracket: boolean;
    startedAt: string | null;
    endedAt: string | null;
  };
};

function StatusBadge({ startedAt, endedAt }: { startedAt?: string | null; endedAt?: string | null }) {
  if (endedAt) return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">종료</span>
  );
  if (startedAt) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />진행 중
    </span>
  );
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">대기 중</span>
  );
}

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null);
  const [checking, setChecking] = useState(true);
  const [hosted, setHosted] = useState<Hosted[]>([]);
  const [parts, setParts] = useState<Participation[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"hosted" | "joined">("hosted");

  useEffect(() => {
    let c = false;
    (async () => {
      const me = await fetch("/api/auth/me", { credentials: "include" });
      const mj = (await me.json()) as { user: { email: string; name: string | null } | null };
      if (c) return;
      if (!mj.user) { setUser(null); setChecking(false); return; }
      setUser(mj.user);
      const [hRes, pRes] = await Promise.all([
        fetch("/api/tournaments/my", { credentials: "include" }),
        fetch("/api/me/participations", { credentials: "include" }),
      ]);
      if (c) return;
      if (!hRes.ok) {
        const j = (await hRes.json()) as { error?: string };
        setErr(j.error ?? "내 대회를 불러오지 못했습니다.");
      } else {
        const j = (await hRes.json()) as { tournaments: Hosted[] };
        setHosted(j.tournaments ?? []);
      }
      if (pRes.ok) {
        const j = (await pRes.json()) as { items: Participation[] };
        setParts(j.items ?? []);
      }
      setChecking(false);
    })();
    return () => { c = true; };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
    router.refresh();
  }

  if (checking) {
    return (
      <DashboardShell title="토너먼트" breadcrumb={[{ label: "강인 매치" }, { label: "토너먼트" }]} activeKey="tournament">
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!user) {
    return (
      <DashboardShell title="토너먼트" breadcrumb={[{ label: "강인 매치" }, { label: "토너먼트" }]} activeKey="tournament">
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
          <svg viewBox="0 0 24 24" fill="none" className="mb-4 h-14 w-14 text-zinc-300" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">로그인이 필요합니다</h2>
          <p className="mt-2 text-sm text-zinc-500">내 대회와 참가 현황을 보려면 로그인해 주세요.</p>
          <Link href="/login?next=/my" className="mt-6 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-500 transition">
            로그인
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="토너먼트"
      breadcrumb={[{ label: "강인 매치" }, { label: "토너먼트" }]}
      activeKey="tournament"
      topRight={
        <Link href="/create" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition">
          + 대회 만들기
        </Link>
      }
    >
      <div className="p-4 sm:p-6">
        {err && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}

        {/* Tabs */}
        <div className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="flex gap-0">
            {[
              { key: "hosted" as const, label: `주최한 대회 (${hosted.length})` },
              { key: "joined" as const, label: `참가한 대회 (${parts.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "relative px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                ].join(" ")}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-red-500" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Hosted tournaments */}
        {activeTab === "hosted" && (
          <div className="mt-5">
            {hosted.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
                <svg viewBox="0 0 24 24" fill="none" className="mb-3 h-10 w-10 text-zinc-300" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M8 21h8M12 17v4M17 3H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
                </svg>
                <p className="text-sm text-zinc-400">아직 만든 대회가 없습니다.</p>
                <Link href="/create" className="mt-3 text-sm font-semibold text-red-600 hover:text-red-500 underline">대회 만들기</Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead className="border-b border-zinc-100 dark:border-zinc-800">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">토너먼트 이름</th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">참가팀</th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">진행 상태</th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">코드</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {hosted.map((t) => (
                        <tr key={t.id} className="border-b border-zinc-50 hover:bg-zinc-50/80 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30 transition">
                          <td className="px-5 py-3.5 font-medium text-zinc-800 dark:text-zinc-100">{t.title || "무제 대회"}</td>
                          <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">{t.participantCount}팀</td>
                          <td className="px-5 py-3.5">
                            <StatusBadge startedAt={t.startedAt} endedAt={t.endedAt} />
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs text-zinc-500">{t.code}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/manage/${t.id}`} className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition">운영</Link>
                              <Link href={`/t/${t.code}`} className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 transition">진행 보기</Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                  {hosted.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-800 dark:text-zinc-100 truncate">{t.title || "무제 대회"}</p>
                        <p className="text-xs text-zinc-500">{t.participantCount}팀 · 코드 {t.code}</p>
                      </div>
                      <StatusBadge startedAt={t.startedAt} endedAt={t.endedAt} />
                      <Link href={`/manage/${t.id}`} className="rounded-xl bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white">운영</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Joined tournaments */}
        {activeTab === "joined" && (
          <div className="mt-5">
            {parts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
                <svg viewBox="0 0 24 24" fill="none" className="mb-3 h-10 w-10 text-zinc-300" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                </svg>
                <p className="text-sm text-zinc-400">참가 내역이 없습니다.</p>
                <p className="mt-1 text-xs text-zinc-400">홈에서 6자리 코드로 참가해 보세요.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {parts.map((p) => (
                  <div key={p.participantId} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-800 dark:text-zinc-100">{p.tournament.title || "무제 대회"}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {p.name} ({p.affiliation}) · 코드 <span className="font-mono">{p.tournament.code}</span>
                        </p>
                      </div>
                      <StatusBadge startedAt={p.tournament.startedAt} endedAt={p.tournament.endedAt} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/t/${p.tournament.code}`} className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition">
                        전체 보기
                      </Link>
                      {p.tournament.hasBracket && (
                        <>
                          <Link href={`/t/${p.tournament.code}#t-schedule`} className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400 transition">경기 순서</Link>
                          <Link href={`/t/${p.tournament.code}#t-bracket`} className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400 transition">대진표</Link>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

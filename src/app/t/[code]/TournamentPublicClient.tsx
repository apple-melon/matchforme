"use client";

import { BracketView } from "@/components/BracketView";
import { PdfExportButton } from "@/components/PdfExportButton";
import { collectMatchScheduleOrder, type BracketData } from "@/lib/bracket";
import {
  computeByeAutoResults,
  parseMatchResultsJson,
  resolveBracketDisplayData,
} from "@/lib/match-results";
import { DashboardShell } from "@/components/DashboardShell";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Payload = {
  id: string;
  code: string;
  title: string;
  format: string;
  bracketJson: string | null;
  matchResultsJson: string | null;
  startedAt: string | null;
  endedAt: string | null;
  participantCount: number;
};

function parseBracket(json: string | null): BracketData | null {
  if (!json) return null;
  try { return JSON.parse(json) as BracketData; } catch { return null; }
}

async function fetchPublic(code: string): Promise<Payload> {
  const res = await fetch(`/api/tournaments/public/${encodeURIComponent(code)}`, { cache: "no-store" });
  const j = (await res.json()) as Payload & { error?: string };
  if (!res.ok) throw new Error(j.error ?? "불러오지 못했습니다.");
  return j;
}

const FORMAT_LABELS: Record<string, string> = {
  TOURNAMENT: "단판 토너먼트",
  LEAGUE: "리그전",
  LEAGUE_PHASED: "리그 (예선+본선)",
  WEIGHT_CLASS: "체급별 토너먼트",
  HEIGHT_CLASS: "키급별 토너먼트",
};

export function TournamentPublicClient({ code }: { code: string }) {
  const digits = code.replace(/\D/g, "").slice(0, 6);
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"bracket" | "schedule">("bracket");

  useEffect(() => {
    if (digits.length !== 6) return;
    let cancelled = false;
    (async () => {
      try {
        const j = await fetchPublic(digits);
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "오류");
      }
    })();
    return () => { cancelled = true; };
  }, [digits]);

  useEffect(() => {
    if (digits.length !== 6 || !data?.id || data?.endedAt) return;
    const tmr = setInterval(() => {
      void fetchPublic(digits)
        .then((j) => setData(j))
        .catch(() => {});
    }, 2500);
    return () => clearInterval(tmr);
  }, [digits, data?.id, data?.endedAt]);

  const bracket = useMemo(() => parseBracket(data?.bracketJson ?? null), [data?.bracketJson]);
  const results = useMemo(() => {
    const raw = parseMatchResultsJson(data?.matchResultsJson);
    if (!bracket) return raw;
    return { ...computeByeAutoResults(bracket), ...raw };
  }, [data?.matchResultsJson, bracket]);
  const displayBracket = useMemo(() => {
    if (!bracket) return null;
    return resolveBracketDisplayData(bracket, results);
  }, [bracket, results]);
  const scheduleRows = useMemo(
    () => (displayBracket ? collectMatchScheduleOrder(displayBracket) : []),
    [displayBracket],
  );

  const completedMatches = useMemo(
    () => scheduleRows.filter((r) => results[r.key ?? r.id] != null).length,
    [scheduleRows, results],
  );

  if (digits.length !== 6) {
    return (
      <DashboardShell title="대회 없음" showSidebar={false}>
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-red-600">
          올바른 코드가 아닙니다.
          <Link href="/" className="mt-4 block text-red-600 underline">홈으로</Link>
        </div>
      </DashboardShell>
    );
  }

  if (err) {
    return (
      <DashboardShell title="오류" showSidebar={false}>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-red-600 dark:text-red-400">{err}</p>
          <Link href="/" className="mt-6 inline-block text-red-600 underline">홈으로</Link>
        </div>
      </DashboardShell>
    );
  }

  if (!data) {
    return (
      <DashboardShell title="불러오는 중…" showSidebar={false}>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  const live = Boolean(data.startedAt) && !data.endedAt;
  const ended = Boolean(data.endedAt);

  const statusBadge = ended ? (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">종료됨</span>
  ) : live ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      LIVE
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">대기 중</span>
  );

  return (
    <DashboardShell
      title={data.title || "무제 대회"}
      breadcrumb={[{ label: "대진표" }, { label: data.title || "무제 대회" }]}
      showSidebar={false}
      topRight={statusBadge}
    >
      <div className="p-4 sm:p-6 space-y-5">

        {/* Hero card */}
        <div className="rounded-2xl bg-gradient-to-r from-red-600 to-red-500 p-5 text-white shadow-md shadow-red-500/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold">{data.title || "무제 대회"}</h1>
                {statusBadge}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  </svg>
                  {data.participantCount}명 참가
                </span>
                {bracket && (
                  <span className="text-white/70">{FORMAT_LABELS[data.format] ?? data.format}</span>
                )}
                <span className="font-mono text-white/60">#{data.code}</span>
              </div>
              {live && (
                <p className="mt-2 text-xs text-white/70">약 2.5초마다 자동 갱신됩니다</p>
              )}
            </div>
            {bracket && (
              <div className="text-right">
                <p className="text-2xl font-extrabold">{completedMatches}<span className="text-sm font-medium text-white/70"> / {scheduleRows.length}</span></p>
                <p className="text-xs text-white/70">경기 완료</p>
              </div>
            )}
          </div>
        </div>

        {!bracket ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-14 text-center dark:border-zinc-700">
            <svg viewBox="0 0 24 24" fill="none" className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M10 7H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3M14 7h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3M10 12h4" />
            </svg>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">아직 대진이 공개되지 않았습니다</p>
            <p className="mt-1 text-xs text-zinc-400">주최자가 대진을 생성하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <>
            {/* View tabs */}
            {scheduleRows.length > 0 && (
              <div className="flex rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900/60">
                {[
                  { key: "bracket" as const, label: "대진표", icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="3" width="7" height="5" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
                      <rect x="8.5" y="16" width="7" height="5" rx="1" />
                      <path d="M6.5 8v4h11V8M12 12v4" />
                    </svg>
                  )},
                  { key: "schedule" as const, label: `경기 순서 (${scheduleRows.length})`, icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  )},
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveView(tab.key)}
                    className={[
                      "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                      activeView === tab.key
                        ? "bg-white text-red-600 shadow-sm dark:bg-zinc-800 dark:text-red-400"
                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                    ].join(" ")}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Bracket view */}
            {(activeView === "bracket" || scheduleRows.length === 0) && (
              <div
                id="t-bracket"
                className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">대진표</h2>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {ended ? "최종 결과입니다." : live ? "경기 결과가 실시간으로 반영됩니다." : "대회 시작 후 결과가 업데이트됩니다."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {live && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        실시간 갱신
                      </span>
                    )}
                    <PdfExportButton fileName={`${data.title || "대진표"}-대진표`} targetId="t-bracket" />
                  </div>
                </div>
                <div className="overflow-x-auto p-4 sm:p-5">
                  <BracketView data={displayBracket ?? bracket} results={results} />
                </div>
              </div>
            )}

            {/* Schedule view */}
            {activeView === "schedule" && scheduleRows.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">경기 순서</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {completedMatches > 0
                      ? `${completedMatches}/${scheduleRows.length}경기 완료`
                      : `총 ${scheduleRows.length}경기 · 라운드 순서로 나열됩니다`}
                  </p>
                </div>
                <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                  {scheduleRows.map((row) => {
                    const k = row.key ?? row.id;
                    const w = results[k];
                    const winnerName = w === "left" ? row.left : w === "right" ? row.right : null;

                    return (
                      <div
                        key={`${row.order}-${row.id}-${row.section}`}
                        className={[
                          "flex items-center gap-3 px-4 py-3.5 sm:gap-4 transition",
                          w != null ? "bg-emerald-50/30 dark:bg-emerald-950/10" : "",
                        ].join(" ")}
                      >
                        {/* Match number */}
                        <div className="flex w-8 shrink-0 flex-col items-center">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {row.order}
                          </span>
                        </div>

                        {/* Round / section */}
                        <div className="hidden w-24 shrink-0 flex-col gap-0.5 sm:flex">
                          {row.section ? (
                            <>
                              <span className="truncate text-[10px] font-medium text-zinc-400 dark:text-zinc-500">{row.section}</span>
                              <span className="truncate text-xs font-bold text-red-600 dark:text-red-400">{row.roundTitle}</span>
                            </>
                          ) : (
                            <span className="truncate text-xs font-bold text-red-600 dark:text-red-400">{row.roundTitle}</span>
                          )}
                        </div>

                        {/* Players */}
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className={[
                            "min-w-0 flex-1 truncate text-right text-sm font-semibold",
                            w === "left"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : w === "right"
                                ? "text-zinc-400 line-through decoration-zinc-300"
                                : "text-zinc-800 dark:text-zinc-100",
                          ].join(" ")}>
                            {row.left}
                          </span>
                          <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white">VS</span>
                          <span className={[
                            "min-w-0 flex-1 truncate text-sm font-semibold",
                            w === "right"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : w === "left"
                                ? "text-zinc-400 line-through decoration-zinc-300"
                                : "text-zinc-800 dark:text-zinc-100",
                          ].join(" ")}>
                            {row.right}
                          </span>
                        </div>

                        {/* Result badge */}
                        <div className="w-14 shrink-0 text-right sm:w-20">
                          {winnerName ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5 shrink-0">
                                <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                              </svg>
                              <span className="hidden sm:inline truncate max-w-[60px]">{winnerName}</span>
                              <span className="sm:hidden">승</span>
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-300 dark:text-zinc-700">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer links */}
        <div className="flex flex-wrap gap-4 pt-2 text-sm">
          <Link
            href={`/join/${data.code}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            참가 신청
          </Link>
          <Link href="/my" className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition">
            내 토너먼트
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition">
            홈으로
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}

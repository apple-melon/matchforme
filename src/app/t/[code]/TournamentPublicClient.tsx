"use client";

import { BracketView } from "@/components/BracketView";
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

function getRoundLabel(format: string, roundIndex: number, totalRounds: number): string {
  if (format !== "TOURNAMENT" && format !== "WEIGHT_CLASS" && format !== "HEIGHT_CLASS") {
    return `라운드 ${roundIndex + 1}`;
  }
  const diff = totalRounds - 1 - roundIndex;
  if (diff === 0) return "결승";
  if (diff === 1) return "4강";
  if (diff === 2) return "8강";
  if (diff === 3) return "16강";
  if (diff === 4) return "32강";
  if (diff === 5) return "64강";
  return `${Math.pow(2, diff + 1)}강`;
}

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

  const live = Boolean(data.startedAt);
  const ended = Boolean(data.endedAt);

  const isBracketTreeFormat = Boolean(
    bracket && (bracket.format === "TOURNAMENT" || bracket.format === "WEIGHT_CLASS" || bracket.format === "HEIGHT_CLASS"),
  );

  const rounds = bracket?.format === "TOURNAMENT" ? (bracket as { rounds: { title: string }[] }).rounds : [];
  const totalRounds = rounds.length;

  return (
    <DashboardShell
      title={data.title || "무제 대회"}
      breadcrumb={[{ label: "대진표" }, { label: data.title || "무제 대회" }]}
      showSidebar={false}
      topRight={
        live && !ended ? (
          <span className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        ) : ended ? (
          <span className="rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">종료됨</span>
        ) : (
          <span className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">대기 중</span>
        )
      }
    >
      <div className="p-4 sm:p-6">
        {/* Info summary */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
          <span>코드 <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">{data.code}</span></span>
          <span>·</span>
          <span>참가 {data.participantCount}명</span>
          {live && !ended && (
            <>
              <span>·</span>
              <span className="text-xs text-zinc-400">약 2.5초마다 자동 갱신</span>
            </>
          )}
        </div>

        <p className="mt-2 text-sm text-zinc-500">
          {ended
            ? "대회가 종료되었습니다. 아래에서 경기 순서와 대진표를 확인할 수 있습니다."
            : live
              ? "주최자가 기록한 경기 결과가 실시간에 가깝게 반영됩니다."
              : "주최자가 대회를 시작하면 여기에 승패가 표시됩니다."}
        </p>

        {!bracket ? (
          <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-400 dark:border-zinc-700">
            <svg viewBox="0 0 24 24" fill="none" className="mx-auto mb-3 h-10 w-10 text-zinc-300" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M10 7H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3M14 7h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3M10 12h4" />
            </svg>
            아직 대진이 공개되지 않았습니다.
          </div>
        ) : (
          <div className="mt-6">
            {/* Round tab navigation for tournament bracket formats */}
            {isBracketTreeFormat && totalRounds > 1 && (
              <div className="mb-4 flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {rounds.map((r, idx) => {
                    const label = getRoundLabel(bracket.format, idx, totalRounds);
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={[
                          "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                          label === getRoundLabel(bracket.format, totalRounds - 1, totalRounds)
                            ? "bg-red-600 text-white shadow-sm"
                            : "border border-zinc-200 bg-white text-zinc-600 hover:border-red-300 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  <button className="rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 transition">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l4 4-4 4M17 7H10M13 21l-4-4 4-4M3 17h7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* View switch tabs */}
            {scheduleRows.length > 0 && (
              <div className="mb-4 border-b border-zinc-200 dark:border-zinc-800">
                <nav className="flex gap-0">
                  {[
                    { key: "bracket" as const, label: "대진표" },
                    { key: "schedule" as const, label: "경기 순서" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveView(tab.key)}
                      className={[
                        "relative px-4 py-3 text-sm font-medium transition-colors",
                        activeView === tab.key
                          ? "text-red-600 dark:text-red-400"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                      ].join(" ")}
                    >
                      {tab.label}
                      {activeView === tab.key && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-red-500" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            )}

            {/* Bracket view */}
            {(activeView === "bracket" || scheduleRows.length === 0) && (
              <div
                id="t-bracket"
                className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">대진표 · 경기 기록</h2>
                  {isBracketTreeFormat && (
                    <p className="text-xs text-zinc-500">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">강조</span> = 승자
                    </p>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <BracketView data={displayBracket ?? bracket} results={results} />
                </div>
              </div>
            )}

            {/* Schedule view */}
            {activeView === "schedule" && scheduleRows.length > 0 && (
              <div id="t-schedule" className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">경기 순서</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">라운드·조 흐름 순입니다.</p>
                </div>
                <div className="max-h-[min(60vh,32rem)] overflow-y-auto">
                  <table className="w-full min-w-[280px] text-sm">
                    <thead className="sticky top-0 border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">구분</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">라운드</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">대진</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleRows.map((row) => {
                        const k = row.key ?? row.id;
                        const w = results[k];
                        return (
                          <tr
                            key={`${row.order}-${row.id}-${row.section}`}
                            className="border-b border-zinc-50 hover:bg-zinc-50/60 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30 transition"
                          >
                            <td className="px-4 py-3 text-zinc-400">{row.order}</td>
                            <td className="max-w-[100px] truncate px-4 py-3 text-xs text-zinc-500" title={row.section}>
                              {row.section || "—"}
                            </td>
                            <td className="max-w-[100px] truncate px-4 py-3 text-xs text-zinc-500" title={row.roundTitle}>
                              {row.roundTitle}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={[
                                  "text-sm font-medium",
                                  w === "left" ? "text-emerald-700 dark:text-emerald-400" : w === "right" ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200",
                                ].join(" ")}>
                                  {row.left}
                                </span>
                                <span className="text-xs font-bold text-red-500">vs</span>
                                <span className={[
                                  "text-sm font-medium",
                                  w === "right" ? "text-emerald-700 dark:text-emerald-400" : w === "left" ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200",
                                ].join(" ")}>
                                  {row.right}
                                </span>
                              </div>
                              {live && w != null && (
                                <p className="mt-0.5 text-[11px] text-zinc-400">
                                  결과: {w === "left" ? row.left : row.right} 승
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer links */}
        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link href={`/join/${data.code}`} className="text-red-600 underline underline-offset-2 hover:text-red-500">참가 신청</Link>
          <span className="text-zinc-300">·</span>
          <Link href="/my" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-600">내 토너먼트</Link>
          <span className="text-zinc-300">·</span>
          <Link href="/" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-600">홈</Link>
        </div>
      </div>
    </DashboardShell>
  );
}

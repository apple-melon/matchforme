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
  try {
    return JSON.parse(json) as BracketData;
  } catch {
    return null;
  }
}

async function fetchPublic(code: string): Promise<Payload> {
  const res = await fetch(`/api/tournaments/public/${encodeURIComponent(code)}`, {
    cache: "no-store",
  });
  const j = (await res.json()) as Payload & { error?: string };
  if (!res.ok) throw new Error(j.error ?? "불러오지 못했습니다.");
  return j;
}

export function TournamentPublicClient({ code }: { code: string }) {
  const digits = code.replace(/\D/g, "").slice(0, 6);
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, [digits]);

  useEffect(() => {
    if (digits.length !== 6 || !data?.id || data?.endedAt) return;
    const tmr = setInterval(() => {
      void fetchPublic(digits)
        .then((j) => setData(j))
        .catch(() => {
          /* 네트워크 일시 오류는 무시 */
        });
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

  const isBracketTreeFormat = Boolean(
    bracket &&
      (bracket.format === "TOURNAMENT" ||
        bracket.format === "WEIGHT_CLASS" ||
        bracket.format === "HEIGHT_CLASS"),
  );

  if (digits.length !== 6) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-red-600">
        올바른 코드가 아닙니다.
        <Link href="/" className="mt-4 block text-accent underline">
          홈으로
        </Link>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-600 dark:text-red-400">{err}</p>
        <Link href="/" className="mt-6 inline-block text-accent underline">
          홈으로
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">불러오는 중…</div>
    );
  }

  const live = Boolean(data.startedAt);
  const ended = Boolean(data.endedAt);

  return (
    <DashboardShell title={data.title} subtitle={`대회 코드 · ${data.code}`} showSidebar={false}>
      <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-10">
        <p className="text-xs font-medium uppercase text-zinc-500">대회 진행 · 관람</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {ended ? (
            <span className="rounded-full bg-zinc-300/90 px-2.5 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-600 dark:text-zinc-100">
              대회 종료
            </span>
          ) : live ? (
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              LIVE · 약 2.5초마다 갱신
            </span>
          ) : (
            <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              대회 시작 전
            </span>
          )}
        </div>
      <p className="mt-1 text-sm text-zinc-500">
        코드 <span className="font-mono font-semibold">{data.code}</span> · 참가 {data.participantCount}명
      </p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {ended
          ? "대회가 종료되었습니다. 아래에서 경기 순서와 대진표·기록을 확인할 수 있습니다."
          : live
            ? "주최자가 기록한 경기 결과가 이 페이지에 실시간에 가깝게 반영됩니다."
            : "주최자가 대회를 시작하면 여기에 승패가 표시됩니다."}
      </p>

      {bracket && scheduleRows.length > 0 ? (
        <nav className="mt-4 flex flex-wrap gap-3 text-sm">
          <a href="#t-schedule" className="text-accent underline underline-offset-2">
            경기 순서로 이동
          </a>
          <a href="#t-bracket" className="text-accent underline underline-offset-2">
            대진표·기록으로 이동
          </a>
        </nav>
      ) : bracket ? (
        <nav className="mt-4 text-sm">
          <a href="#t-bracket" className="text-accent underline underline-offset-2">
            대진표·기록으로 이동
          </a>
        </nav>
      ) : null}

      {!bracket ? (
        <p className="mt-10 rounded-xl border border-zinc-200 bg-card p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          아직 대진이 공개되지 않았습니다.
        </p>
      ) : (
        <>
          {isBracketTreeFormat ? (
            <section
              id="t-bracket"
              className="scroll-mt-24 mt-8 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">대진표 · 경기 기록</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                선으로 이어진 매치가 라운드 진행을 나타냅니다.{" "}
                <span className="font-medium text-emerald-700 dark:text-emerald-300">강조</span>는 승자, 취소선은 패자
                입니다.
              </p>
              <div className="mt-4 overflow-x-auto">
                <BracketView data={displayBracket ?? bracket} results={results} />
              </div>
            </section>
          ) : null}

          {scheduleRows.length > 0 ? (
            <section
              id="t-schedule"
              className="scroll-mt-24 mt-8 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">경기 순서</h2>
              <p className="mt-1 text-xs text-zinc-500">
                라운드·조 흐름 순입니다. 토너먼트는 앞 라운드 종료 후 다음 경기가 열립니다.
              </p>
              <div className="mt-4 max-h-[min(50vh,28rem)] overflow-y-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                    <tr>
                      <th className="w-12 px-3 py-2">#</th>
                      <th className="px-3 py-2">구분</th>
                      <th className="px-3 py-2">라운드</th>
                      <th className="px-3 py-2">대진</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleRows.map((row) => {
                      const k = row.key ?? row.id;
                      const w = results[k];
                      return (
                        <tr
                          key={`${row.order}-${row.id}-${row.section}`}
                          className="border-t border-zinc-100 dark:border-zinc-800"
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-zinc-500">{row.order}</td>
                          <td className="max-w-[120px] truncate px-3 py-2 text-zinc-600 dark:text-zinc-400" title={row.section}>
                            {row.section || "—"}
                          </td>
                          <td className="max-w-[100px] truncate px-3 py-2 text-zinc-600 dark:text-zinc-400" title={row.roundTitle}>
                            {row.roundTitle}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-xs text-zinc-400">{row.id}</span>
                            <div className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                              <span
                                className={
                                  w === "left"
                                    ? "font-semibold text-emerald-700 dark:text-emerald-300"
                                    : w === "right"
                                      ? "text-zinc-500 line-through decoration-zinc-400 dark:text-zinc-500"
                                      : ""
                                }
                              >
                                {row.left}
                              </span>
                              <span className="mx-1 text-accent">vs</span>
                              <span
                                className={
                                  w === "right"
                                    ? "font-semibold text-emerald-700 dark:text-emerald-300"
                                    : w === "left"
                                      ? "text-zinc-500 line-through decoration-zinc-400 dark:text-zinc-500"
                                      : ""
                                }
                              >
                                {row.right}
                              </span>
                            </div>
                            {live && w != null ? (
                              <p className="mt-1 text-[11px] text-zinc-500">
                                결과: {w === "left" ? row.left : row.right} 승
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {!isBracketTreeFormat ? (
            <div
              id="t-bracket"
              className="scroll-mt-24 mt-8 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">대회 진행 상황 · 대진표 · 경기 기록</h2>
              <BracketView data={displayBracket ?? bracket} results={results} />
            </div>
          ) : null}
        </>
      )}

      <p className="mt-10 text-center text-sm">
        <Link href={`/join/${data.code}`} className="text-accent underline">
          참가 신청 페이지
        </Link>
        {" · "}
        <Link href="/profile" className="text-zinc-500 underline">
          프로필
        </Link>
        {" · "}
        <Link href="/" className="text-zinc-500 underline">
          홈
        </Link>
      </p>
    </div>
    </DashboardShell>
  );
}

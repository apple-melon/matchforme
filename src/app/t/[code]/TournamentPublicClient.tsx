"use client";

import { BracketView } from "@/components/BracketView";
import type { BracketData } from "@/lib/bracket";
import { parseMatchResultsJson } from "@/lib/match-results";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Payload = {
  code: string;
  title: string;
  format: string;
  bracketJson: string | null;
  matchResultsJson: string | null;
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

export function TournamentPublicClient({ code }: { code: string }) {
  const digits = code.replace(/\D/g, "").slice(0, 6);
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (digits.length !== 6) {
      setErr("6자리 숫자 코드가 아닙니다.");
      return;
    }
    let c = false;
    (async () => {
      const res = await fetch(`/api/tournaments/public/${encodeURIComponent(digits)}`);
      const j = (await res.json()) as Payload & { error?: string };
      if (c) return;
      if (!res.ok) {
        setErr(j.error ?? "대회를 찾을 수 없습니다.");
        return;
      }
      setData(j);
    })();
    return () => {
      c = true;
    };
  }, [digits]);

  const bracket = useMemo(() => parseBracket(data?.bracketJson ?? null), [data?.bracketJson]);
  const results = useMemo(() => parseMatchResultsJson(data?.matchResultsJson), [data?.matchResultsJson]);

  if (digits.length !== 6) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-red-600">
        올바른 코드가 아닙니다.
        <Link href="/" className="mt-4 block text-amber-600 underline">
          홈으로
        </Link>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-600 dark:text-red-400">{err}</p>
        <Link href="/" className="mt-6 inline-block text-amber-600 underline">
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-medium uppercase text-zinc-500">대회 진행 · 관람</p>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{data.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        코드 <span className="font-mono font-semibold">{data.code}</span> · 참가 {data.participantCount}명
      </p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        승패는 주최자가 기록합니다. 아래는 현재까지 반영된 대진과 결과입니다.
      </p>

      {!bracket ? (
        <p className="mt-10 rounded-xl border border-zinc-200 bg-card p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          아직 대진이 공개되지 않았습니다.
        </p>
      ) : (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <BracketView data={bracket} results={results} />
        </div>
      )}

      <p className="mt-10 text-center text-sm">
        <Link href={`/join/${data.code}`} className="text-amber-600 underline">
          참가 신청 페이지
        </Link>
        {" · "}
        <Link href="/my" className="text-zinc-500 underline">
          내 대회 · 내 참가
        </Link>
        {" · "}
        <Link href="/" className="text-zinc-500 underline">
          홈
        </Link>
      </p>
    </div>
  );
}

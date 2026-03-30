"use client";

import type { BracketData, DrawMatch, DrawRound } from "@/lib/bracket";

function MatchCard({ m }: { m: DrawMatch }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{m.id}</p>
      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{m.left}</span>
        <span className="hidden text-zinc-400 sm:inline">VS</span>
        <span className="text-center text-xs font-semibold text-amber-600 sm:hidden">VS</span>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{m.right}</span>
      </div>
    </div>
  );
}

function RoundsList({ rounds }: { rounds: DrawRound[] }) {
  return (
    <div className="space-y-8">
      {rounds.map((r) => (
        <section key={r.title}>
          <h3 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">{r.title}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {r.matches.map((m) => (
              <MatchCard key={`${r.title}-${m.id}`} m={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function BracketView({ data }: { data: BracketData }) {
  if (data.format === "LEAGUE_PHASED") {
    return (
      <div className="space-y-10">
        <div>
          <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">예선</h2>
          <div className="space-y-8">
            {data.preliminary.map((g) => (
              <div key={g.groupName}>
                <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                  조별 리그 후 A/B조 1위를 정해 본선에 진출합니다.
                </p>
                <RoundsList rounds={g.rounds} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">본선</h2>
          <RoundsList rounds={data.main} />
        </div>
      </div>
    );
  }

  return <RoundsList rounds={data.rounds} />;
}

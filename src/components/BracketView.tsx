"use client";

import type { BracketData, DrawMatch, DrawRound } from "@/lib/bracket";
import type { MatchResults } from "@/lib/match-results";
import { TournamentBracketTree } from "@/components/TournamentBracketTree";

type ViewProps = {
  data: BracketData;
  results?: MatchResults;
  editable?: boolean;
  onSetWinner?: (matchKey: string, winner: "left" | "right" | null) => void;
};

function MatchCard({ m, results, editable, onSetWinner }: { m: DrawMatch } & Omit<ViewProps, "data">) {
  const r = results ?? {};
  const k = m.key ?? m.id;
  const w = r[k];

  return (
    <div className="rounded-xl border-2 border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-600 dark:bg-zinc-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{m.id}</p>
      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span
          className={`font-medium ${
            w === "left" ? "rounded-md bg-emerald-500/20 px-2 py-1 text-emerald-900 dark:text-emerald-100" : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {m.left}
        </span>
        <span className="hidden text-center text-xs font-semibold text-amber-600 sm:inline">VS</span>
        <span className="text-center text-xs font-semibold text-amber-600 sm:hidden">VS</span>
        <span
          className={`font-medium ${
            w === "right" ? "rounded-md bg-emerald-500/20 px-2 py-1 text-emerald-900 dark:text-emerald-100" : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {m.right}
        </span>
      </div>
      {editable && onSetWinner ? (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => onSetWinner(k, "left")}
            className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium dark:bg-zinc-800"
          >
            왼쪽 승
          </button>
          <button
            type="button"
            onClick={() => onSetWinner(k, "right")}
            className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium dark:bg-zinc-800"
          >
            오른쪽 승
          </button>
          <button
            type="button"
            onClick={() => onSetWinner(k, null)}
            className="rounded border border-zinc-200 px-2 py-0.5 text-[11px] dark:border-zinc-600"
          >
            초기화
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RoundsList({
  rounds,
  results,
  editable,
  onSetWinner,
}: {
  rounds: DrawRound[];
} & Omit<ViewProps, "data">) {
  const r = results ?? {};
  return (
    <div className="space-y-8">
      {rounds.map((round) => (
        <section key={round.title}>
          <h3 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">{round.title}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {round.matches.map((m) => (
              <MatchCard
                key={m.key ?? m.id}
                m={m}
                results={r}
                editable={editable}
                onSetWinner={onSetWinner}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function BracketView({ data, results = {}, editable, onSetWinner }: ViewProps) {
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
                <RoundsList rounds={g.rounds} results={results} editable={editable} onSetWinner={onSetWinner} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">본선</h2>
          <RoundsList rounds={data.main} results={results} editable={editable} onSetWinner={onSetWinner} />
        </div>
      </div>
    );
  }

  if (data.format === "WEIGHT_CLASS" || data.format === "HEIGHT_CLASS") {
    const kind = data.format === "WEIGHT_CLASS" ? "체급(몸무게)" : "키급";
    return (
      <div className="space-y-10">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {kind} 순으로 정렬한 뒤 {data.groups.length}개 조로 나누어 각 조에서 토너먼트를 진행합니다.
        </p>
        {data.groups.map((g) => (
          <div key={g.label}>
            <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">{g.label}</h2>
            <p className="mb-4 text-xs text-zinc-500">
              범위: {g.minVal}
              {g.unit} ~ {g.maxVal}
              {g.unit}
            </p>
            <TournamentBracketTree
              rounds={g.rounds}
              results={results}
              editable={editable}
              onSetWinner={onSetWinner}
            />
          </div>
        ))}
      </div>
    );
  }

  if (data.format === "TOURNAMENT") {
    return (
      <TournamentBracketTree
        rounds={data.rounds}
        results={results}
        editable={editable}
        onSetWinner={onSetWinner}
      />
    );
  }

  return <RoundsList rounds={data.rounds} results={results} editable={editable} onSetWinner={onSetWinner} />;
}

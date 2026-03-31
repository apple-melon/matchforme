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

  const leftWin = w === "left";
  const rightWin = w === "right";
  const leftLose = w != null && w === "right";
  const rightLose = w != null && w === "left";

  const sideClass = (win: boolean, lose: boolean) =>
    `block w-full rounded-md px-2 py-1.5 text-left text-sm font-medium transition hover:ring-2 hover:ring-accent/30 ${
      win
        ? "bg-emerald-500/20 text-emerald-900 ring-1 ring-emerald-500/25 dark:text-emerald-100"
        : lose
          ? "text-zinc-500 line-through decoration-zinc-400 dark:text-zinc-400 dark:decoration-zinc-500"
          : "text-zinc-900 dark:text-zinc-100"
    }`;

  return (
    <div className="rounded-xl border-2 border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-600 dark:bg-zinc-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{m.id}</p>
      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-stretch sm:justify-between">
        {editable && onSetWinner ? (
          <button type="button" onClick={() => onSetWinner(k, "left")} className={sideClass(leftWin, leftLose)} title="클릭하여 승자로 기록">
            {m.left}
          </button>
        ) : (
          <span className={sideClass(leftWin, leftLose)}>{m.left}</span>
        )}
        <span className="hidden shrink-0 self-center text-center text-xs font-semibold text-accent sm:inline">VS</span>
        <span className="shrink-0 self-center text-center text-xs font-semibold text-accent sm:hidden">VS</span>
        {editable && onSetWinner ? (
          <button type="button" onClick={() => onSetWinner(k, "right")} className={sideClass(rightWin, rightLose)} title="클릭하여 승자로 기록">
            {m.right}
          </button>
        ) : (
          <span className={sideClass(rightWin, rightLose)}>{m.right}</span>
        )}
      </div>
      {editable && onSetWinner && w != null ? (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-700">
          <p className="mb-1.5 text-[10px] text-zinc-500">승자: 이름을 눌러 선택 · 아래는 초기화</p>
          <button
            type="button"
            onClick={() => onSetWinner(k, null)}
            className="rounded border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            이 경기 결과 초기화
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

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
  const leftLose = w === "right";
  const rightLose = w === "left";
  const hasResult = w != null;

  const sideClass = (win: boolean, lose: boolean) => [
    "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition",
    win
      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-700"
      : lose
        ? "text-zinc-400 line-through decoration-zinc-300 dark:text-zinc-500"
        : "text-zinc-800 dark:text-zinc-100",
    editable && !lose ? "hover:ring-2 hover:ring-red-300/40 cursor-pointer" : "",
  ].join(" ");

  return (
    <div className={[
      "rounded-2xl border bg-white p-4 transition dark:bg-zinc-900",
      hasResult
        ? "border-emerald-200 shadow-sm dark:border-emerald-800/50"
        : "border-zinc-200 shadow-sm dark:border-zinc-800",
    ].join(" ")}>
      <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{m.id}</p>
      <div className="flex flex-col gap-1.5">
        {editable && onSetWinner ? (
          <button type="button" onClick={() => onSetWinner(k, "left")} className={sideClass(leftWin, leftLose)}>
            <span className="flex items-center gap-1.5">
              {leftWin && <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 shrink-0 text-emerald-600"><path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" /></svg>}
              {m.left}
            </span>
          </button>
        ) : (
          <div className={sideClass(leftWin, leftLose)}>
            <span className="flex items-center gap-1.5">
              {leftWin && <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 shrink-0 text-emerald-600"><path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" /></svg>}
              {m.left}
            </span>
          </div>
        )}
        {/* VS divider */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-500 dark:bg-red-950/30 dark:text-red-400">VS</span>
          <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
        </div>
        {editable && onSetWinner ? (
          <button type="button" onClick={() => onSetWinner(k, "right")} className={sideClass(rightWin, rightLose)}>
            <span className="flex items-center gap-1.5">
              {rightWin && <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 shrink-0 text-emerald-600"><path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" /></svg>}
              {m.right}
            </span>
          </button>
        ) : (
          <div className={sideClass(rightWin, rightLose)}>
            <span className="flex items-center gap-1.5">
              {rightWin && <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 shrink-0 text-emerald-600"><path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" /></svg>}
              {m.right}
            </span>
          </div>
        )}
      </div>
      {editable && onSetWinner && w != null ? (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => onSetWinner(k, null)}
            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
          >
            결과 초기화
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
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-200">
            <span className="rounded-lg bg-red-50 px-2.5 py-1 text-red-600 dark:bg-red-950/30 dark:text-red-400">
              {round.title}
            </span>
          </h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            <span className="rounded-lg bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800">예선</span>
          </h2>
          <p className="mb-6 text-sm text-zinc-500">A/B조 리그 후 1위가 본선에 진출합니다.</p>
          <div className="space-y-8">
            {data.preliminary.map((g) => (
              <div key={g.groupName}>
                <h3 className="mb-4 font-semibold text-zinc-700 dark:text-zinc-300">{g.groupName}</h3>
                <RoundsList rounds={g.rounds} results={results} editable={editable} onSetWinner={onSetWinner} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            <span className="rounded-lg bg-red-50 px-3 py-1 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">본선</span>
          </h2>
          <RoundsList rounds={data.main} results={results} editable={editable} onSetWinner={onSetWinner} />
        </div>
      </div>
    );
  }

  if (data.format === "WEIGHT_CLASS" || data.format === "HEIGHT_CLASS") {
    const kind = data.format === "WEIGHT_CLASS" ? "체급(몸무게)" : "키급";
    return (
      <div className="space-y-10">
        <p className="text-sm text-zinc-500">
          {kind} 순으로 정렬 후 {data.groups.length}개 조로 나누어 각 조 토너먼트를 진행합니다.
        </p>
        {data.groups.map((g) => (
          <div key={g.label}>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{g.label}</h2>
              <span className="text-xs text-zinc-400">{g.minVal}{g.unit} ~ {g.maxVal}{g.unit}</span>
            </div>
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

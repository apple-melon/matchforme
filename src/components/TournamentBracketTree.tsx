"use client";

import type { DrawMatch, DrawRound } from "@/lib/bracket";
import type { MatchResults } from "@/lib/match-results";

type Props = {
  rounds: DrawRound[];
  results: MatchResults;
  editable?: boolean;
  onSetWinner?: (matchKey: string, winner: "left" | "right" | null) => void;
};

const COL_W = 260;
const CONNECTOR_W = 36;
/** 세로 간격 단위 — 라운드가 깊을수록 1라운드 매치 간 거리가 넓어짐 */
const UNIT = 42;
/** 라운드 제목 + 여백 (첫 경기 카드와 겹치지 않게) */
const PAD_TOP = 52;
const PAD_BOTTOM = 24;

function isByeLabel(text: string): boolean {
  const t = text.trim();
  return t === "부전승" || t.startsWith("부전승");
}

/** 각 라운드 매치 박스의 세로 중심(y) — 상단 기준 px */
function computeMatchCentersY(rounds: DrawRound[]): number[][] {
  const R = rounds.length;
  if (R === 0) return [];
  const m0 = rounds[0]?.matches.length ?? 0;
  if (m0 === 0) return rounds.map(() => []);

  const sep0 = UNIT * 2 ** (R - 1);
  const centers: number[][] = [];

  for (let r = 0; r < R; r++) {
    const m = rounds[r].matches.length;
    const row: number[] = [];
    if (r === 0) {
      for (let i = 0; i < m; i++) {
        row.push(PAD_TOP + (i + 0.5) * sep0);
      }
    } else {
      for (let j = 0; j < m; j++) {
        const prev = centers[r - 1]!;
        const a = prev[2 * j];
        const b = prev[2 * j + 1];
        if (a != null && b != null) {
          row.push((a + b) / 2);
        } else if (a != null) {
          row.push(a);
        } else {
          row.push(PAD_TOP);
        }
      }
    }
    centers.push(row);
  }
  return centers;
}

function totalBracketHeight(rounds: DrawRound[], centers: number[][], cardH: number): number {
  const m0 = rounds[0]?.matches.length ?? 0;
  const R = rounds.length;
  if (m0 === 0 || R === 0) return cardH + PAD_TOP + PAD_BOTTOM;
  let maxBottom = PAD_TOP + m0 * (UNIT * 2 ** (R - 1));
  for (let r = 0; r < R; r++) {
    for (let i = 0; i < centers[r].length; i++) {
      const cy = centers[r][i]!;
      maxBottom = Math.max(maxBottom, cy + cardH / 2);
    }
  }
  return Math.ceil(maxBottom + PAD_BOTTOM);
}

function SideRow({ text, winner }: { text: string; winner: boolean }) {
  const bye = isByeLabel(text);
  return (
    <div className="relative">
      {bye ? (
        <span className="absolute -right-0.5 -top-2 rounded bg-zinc-200 px-1 text-[9px] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
          부전승
        </span>
      ) : null}
      <div
        className={`rounded-md px-2 py-1.5 text-sm leading-snug ${
          bye
            ? "border border-dashed border-zinc-300 bg-zinc-50 italic text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-400"
            : "text-zinc-900 dark:text-zinc-100"
        } ${
          winner
            ? "bg-emerald-500/20 font-medium text-emerald-900 dark:text-emerald-100"
            : ""
        }`}
        title={text}
      >
        <span className="line-clamp-3 break-words">{bye ? "부전승 (상대 없음 · 자동 진행)" : text}</span>
      </div>
    </div>
  );
}

function MatchCell({
  m,
  results,
  editable,
  onSetWinner,
  cardMinH,
}: {
  m: DrawMatch;
  results: MatchResults;
  editable?: boolean;
  onSetWinner?: Props["onSetWinner"];
  cardMinH: number;
}) {
  const k = m.key ?? m.id;
  const w = results[k];

  return (
    <div
      className="flex min-h-0 flex-col rounded-xl border-2 border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-600 dark:bg-zinc-900"
      style={{ minHeight: cardMinH }}
    >
      <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{m.id}</p>
      <div className="mt-2 flex min-h-0 flex-1 flex-col justify-center gap-1">
        <SideRow text={m.left} winner={w === "left"} />
        <div className="py-0.5 text-center text-[10px] font-bold text-amber-600">VS</div>
        <SideRow text={m.right} winner={w === "right"} />
      </div>
      {editable ? (
        <div className="mt-2 flex shrink-0 flex-wrap gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => onSetWinner?.(k, "left")}
            className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium dark:bg-zinc-800"
          >
            왼쪽 승
          </button>
          <button
            type="button"
            onClick={() => onSetWinner?.(k, "right")}
            className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium dark:bg-zinc-800"
          >
            오른쪽 승
          </button>
          <button
            type="button"
            onClick={() => onSetWinner?.(k, null)}
            className="rounded border border-zinc-200 px-2 py-0.5 text-[11px] dark:border-zinc-600"
          >
            초기화
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ConnectorColumn({
  centersFrom,
  centersTo,
  height,
  width,
}: {
  centersFrom: number[];
  centersTo: number[];
  height: number;
  width: number;
}) {
  const jx = Math.max(10, width * 0.42);
  return (
    <svg
      width={width}
      height={height}
      className="shrink-0 text-zinc-400 dark:text-zinc-500 print:text-zinc-800"
      aria-hidden
    >
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square">
        {centersTo.map((yp, j) => {
          const y1 = centersFrom[2 * j];
          const y2 = centersFrom[2 * j + 1];
          if (y1 == null || y2 == null) return null;
          const ya = Math.min(y1, y2);
          const yb = Math.max(y1, y2);
          const d = `M 0 ${y1} L ${jx} ${y1} M 0 ${y2} L ${jx} ${y2} M ${jx} ${ya} L ${jx} ${yb} M ${jx} ${yp} L ${width} ${yp}`;
          return <path key={j} d={d} />;
        })}
      </g>
    </svg>
  );
}

/**
 * 단판 토너먼트: 라운드 열 + SVG로 이전 라운드 두 경기에서 다음 라운드 한 경기로 이어지는 연결선.
 * 부전승 슬롯은 점선 테두리·라벨로 구분합니다.
 */
export function TournamentBracketTree({ rounds, results, editable, onSetWinner }: Props) {
  const R = rounds.length;
  const cardMinH = editable ? 168 : 118;

  if (R === 0) {
    return null;
  }

  const centers = computeMatchCentersY(rounds);
  const totalH = totalBracketHeight(rounds, centers, cardMinH);

  return (
    <div className="overflow-x-auto pb-4 print:overflow-visible">
      <div
        className="inline-flex min-w-min flex-row flex-nowrap items-stretch rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40 print:border-zinc-300 print:bg-white"
        style={{ minHeight: totalH }}
      >
        {rounds.map((round, r) => (
          <div key={round.title} className="flex flex-row flex-nowrap items-stretch">
            {r > 0 ? (
              <ConnectorColumn
                centersFrom={centers[r - 1] ?? []}
                centersTo={centers[r] ?? []}
                height={totalH}
                width={CONNECTOR_W}
              />
            ) : null}
            <div
              className="relative shrink-0"
              style={{ width: COL_W, minHeight: totalH, height: totalH }}
            >
              <p
                className="absolute left-0 right-0 top-2 z-10 text-center text-[11px] font-bold text-zinc-500 dark:text-zinc-400"
                style={{ pointerEvents: "none" }}
              >
                {round.title}
              </p>
              {round.matches.map((m, i) => {
                const cy = centers[r]?.[i] ?? PAD_TOP + cardMinH / 2;
                const top = cy - cardMinH / 2;
                return (
                  <div
                    key={m.key ?? m.id}
                    className="absolute left-0 right-0"
                    style={{ top, width: COL_W }}
                  >
                    <MatchCell
                      m={m}
                      results={results}
                      editable={editable}
                      onSetWinner={onSetWinner}
                      cardMinH={cardMinH}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
        부전승은 참가자 수가 2의 거듭제곱이 아닐 때 빈 슬롯으로 배정되며, 해당 라운드는 자동으로 다음 라운드에 진출합니다.
      </p>
    </div>
  );
}

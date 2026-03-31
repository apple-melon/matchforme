import { randomUUID } from "crypto";

export type DrawFormat =
  | "TOURNAMENT"
  | "LEAGUE"
  | "LEAGUE_PHASED"
  | "WEIGHT_CLASS"
  | "HEIGHT_CLASS";

export type SeedBy = "random" | "weightKg" | "heightCm";

export type Player = {
  name: string;
  affiliation: string;
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
};

export type DrawMatch = { key?: string; id: string; left: string; right: string };

export type DrawRound = { title: string; matches: DrawMatch[] };

export type ClassGroup = {
  label: string;
  minVal: number;
  maxVal: number;
  unit: "kg" | "cm";
  rounds: DrawRound[];
};

export type BracketData =
  | { format: "TOURNAMENT"; rounds: DrawRound[] }
  | { format: "LEAGUE"; rounds: DrawRound[] }
  | {
      format: "LEAGUE_PHASED";
      preliminary: { groupName: string; rounds: DrawRound[] }[];
      main: DrawRound[];
    }
  | { format: "WEIGHT_CLASS"; groups: ClassGroup[] }
  | { format: "HEIGHT_CLASS"; groups: ClassGroup[] };

export type DrawError = { error: string };

export type DrawOptions = {
  splitClassCount?: number;
  seedBy?: SeedBy;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** 대진표에 표시할 문자열 (추가 정보 포함) */
export function fmt(p: Player): string {
  const aff = (p.affiliation ?? "").trim();
  const name = (p.name ?? "").trim();
  const base = aff ? `${aff} ${name}`.trim() : name;
  const bits: string[] = [base || name || "—"];
  if (p.weightKg != null && Number.isFinite(p.weightKg)) bits.push(`${p.weightKg}kg`);
  if (p.heightCm != null && Number.isFinite(p.heightCm)) bits.push(`${p.heightCm}cm`);
  if (p.age != null && Number.isFinite(p.age)) bits.push(`만${p.age}세`);
  return bits.join(" · ");
}

type Side =
  | { kind: "p"; name: string; affiliation: string; extra?: Player }
  | { kind: "bye" }
  | { kind: "w"; ref: string };

function sideText(s: Side): string {
  if (s.kind === "bye") return "부전승";
  if (s.kind === "p") return s.extra ? fmt(s.extra) : fmt({ name: s.name, affiliation: s.affiliation });
  return `${s.ref} 승자`;
}

function playerToSide(p: Player): Side {
  return { kind: "p", name: p.name, affiliation: p.affiliation, extra: p };
}

function slotToSide(s: Player | null | undefined): Side {
  if (!s) return { kind: "bye" };
  return playerToSide(s);
}

function winnerSide(m: { id: string; left: Side; right: Side }): Side {
  if (m.left.kind === "bye") return m.right;
  if (m.right.kind === "bye") return m.left;
  return { kind: "w", ref: m.id };
}

function roundTitleForLayer(layerLen: number, roundIdx: number): string {
  if (roundIdx === 1) return "1라운드";
  if (layerLen === 1) return "결승전";
  if (layerLen === 2) return "준결승";
  return `${roundIdx}라운드`;
}

function orderPlayers(players: Player[], seedBy: SeedBy): Player[] {
  const copy = [...players];
  if (seedBy === "random") return shuffle(copy);
  if (seedBy === "weightKg") {
    return copy.sort((a, b) => {
      const aw = a.weightKg ?? Number.POSITIVE_INFINITY;
      const bw = b.weightKg ?? Number.POSITIVE_INFINITY;
      if (aw !== bw) return aw - bw;
      return `${a.affiliation}${a.name}`.localeCompare(`${b.affiliation}${b.name}`, "ko");
    });
  }
  if (seedBy === "heightCm") {
    return copy.sort((a, b) => {
      const ah = a.heightCm ?? Number.POSITIVE_INFINITY;
      const bh = b.heightCm ?? Number.POSITIVE_INFINITY;
      if (ah !== bh) return ah - bh;
      return `${a.affiliation}${a.name}`.localeCompare(`${b.affiliation}${b.name}`, "ko");
    });
  }
  return shuffle(copy);
}

export function buildTournament(players: Player[], seedBy: SeedBy = "random"): BracketData | DrawError {
  const ordered = orderPlayers(players, seedBy);
  const n = ordered.length;
  if (n < 2) return { error: "토너먼트는 참가자 2명 이상이 필요합니다." };

  const exp = Math.ceil(Math.log2(n));
  const size = 2 ** exp;
  const slots: (Player | null)[] = [
    ...ordered.map((p) => p),
    ...Array(size - n).fill(null),
  ];

  let matchNum = 1;
  const nextId = () => {
    const id = `${matchNum}경기`;
    matchNum += 1;
    return id;
  };

  let layer: { id: string; left: Side; right: Side }[] = [];
  for (let i = 0; i < slots.length; i += 2) {
    layer.push({
      id: nextId(),
      left: slotToSide(slots[i] ?? null),
      right: slotToSide(slots[i + 1] ?? null),
    });
  }

  const rounds: DrawRound[] = [];
  let roundIdx = 1;

  while (layer.length > 0) {
    const title = roundTitleForLayer(layer.length, roundIdx);
    const matches: DrawMatch[] = layer.map((m) => ({
      id: m.id,
      left: sideText(m.left),
      right: sideText(m.right),
    }));
    rounds.push({ title, matches });

    if (layer.length === 1) break;

    const next: typeof layer = [];
    for (let i = 0; i < layer.length; i += 2) {
      const m1 = layer[i];
      const m2 = layer[i + 1];
      if (!m1) break;
      next.push({
        id: nextId(),
        left: winnerSide(m1),
        right: m2 ? winnerSide(m2) : { kind: "bye" },
      });
    }
    layer = next;
    roundIdx += 1;
  }

  return { format: "TOURNAMENT", rounds };
}

function roundRobinMatches(group: Player[], groupLabel: string): DrawMatch[] {
  const n = group.length;
  const out: DrawMatch[] = [];
  if (n < 2) return out;
  let num = 1;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = group[i]!;
      const b = group[j]!;
      out.push({
        id: `${groupLabel}-${num}경기`,
        left: fmt(a),
        right: fmt(b),
      });
      num += 1;
    }
  }
  return shuffle(out);
}

export function buildLeague(players: Player[], seedBy: SeedBy = "random"): BracketData | DrawError {
  const ordered = orderPlayers(players, seedBy);
  const n = ordered.length;
  if (n < 2) return { error: "리그전은 참가자 2명 이상이 필요합니다." };

  const matches = roundRobinMatches(ordered, "리그");
  matches.forEach((m, i) => {
    m.id = `${i + 1}경기`;
  });

  return {
    format: "LEAGUE",
    rounds: [{ title: "리그전 (전원 대전)", matches }],
  };
}

function groupRoundRobinRounds(group: Player[], name: string): DrawRound[] {
  const matches = roundRobinMatches(group, name);
  if (matches.length === 0) {
    return [
      {
        title: `${name}조 (단독)`,
        matches: [
          {
            id: `${name}조 대표`,
            left: fmt(group[0]!),
            right: "본선 직행",
          },
        ],
      },
    ];
  }
  matches.forEach((m, i) => {
    m.id = `${name}조 ${i + 1}경기`;
  });
  return [{ title: `${name}조 예선 (리그)`, matches }];
}

export function buildLeaguePhased(players: Player[], seedBy: SeedBy = "random"): BracketData | DrawError {
  const ordered = orderPlayers(players, seedBy);
  const n = ordered.length;
  if (n < 2) return { error: "예선·본선 리그는 참가자 2명 이상이 필요합니다." };

  const mid = Math.ceil(n / 2);
  const groupA = ordered.slice(0, mid);
  const groupB = ordered.slice(mid);

  const preliminary = [
    { groupName: "A", rounds: groupRoundRobinRounds(groupA, "A") },
    { groupName: "B", rounds: groupRoundRobinRounds(groupB, "B") },
  ];

  const main: DrawRound[] = [
    {
      title: "본선 결승",
      matches: [
        {
          id: "결승전",
          left: "A조 1위",
          right: "B조 1위",
        },
      ],
    },
  ];

  return { format: "LEAGUE_PHASED", preliminary, main };
}

function splitSortedGroups(sorted: Player[], classCount: number): Player[][] {
  const n = sorted.length;
  if (n === 0) return [];
  const k = Math.max(1, Math.min(classCount, n));
  const chunks: Player[][] = [];
  const base = Math.floor(n / k);
  const rem = n % k;
  let idx = 0;
  for (let i = 0; i < k; i++) {
    const size = base + (i < rem ? 1 : 0);
    chunks.push(sorted.slice(idx, idx + size));
    idx += size;
  }
  return chunks;
}

function numericLabel(
  group: Player[],
  key: "weightKg" | "heightCm",
  unit: "kg" | "cm",
  index: number,
): { label: string; minVal: number; maxVal: number } {
  const vals = group.map((p) => p[key]).filter((v): v is number => v != null && Number.isFinite(v));
  if (vals.length === 0) {
    return { label: `그룹 ${index + 1}`, minVal: 0, maxVal: 0 };
  }
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const u = unit === "kg" ? "kg" : "cm";
  return {
    label: `${index + 1}조 (${minVal}–${maxVal}${u})`,
    minVal,
    maxVal,
  };
}

function buildClassBracket(group: Player[], seedBy: SeedBy): DrawRound[] {
  if (group.length < 1) return [];
  if (group.length === 1) {
    return [
      {
        title: "본 조",
        matches: [
          {
            id: "단독",
            left: fmt(group[0]!),
            right: "단독 참가",
          },
        ],
      },
    ];
  }
  const t = buildTournament(group, seedBy);
  if ("error" in t) return [];
  if (t.format !== "TOURNAMENT") return [];
  return t.rounds;
}

export function buildWeightClassTournaments(
  players: Player[],
  classCount: number,
  seedBy: SeedBy,
): BracketData | DrawError {
  const missing = players.filter((p) => p.weightKg == null || !Number.isFinite(p.weightKg));
  if (missing.length > 0) {
    return { error: "체급별 토너먼트는 모든 참가자의 몸무게(kg)가 필요합니다. 미입력자를 삭제하거나 정보를 받도록 설정하세요." };
  }
  const sorted = [...players].sort((a, b) => (a.weightKg! - b.weightKg!));
  const chunks = splitSortedGroups(sorted, classCount);
  const groups: ClassGroup[] = chunks.map((chunk, i) => {
    const { label, minVal, maxVal } = numericLabel(chunk, "weightKg", "kg", i);
    return {
      label,
      minVal,
      maxVal,
      unit: "kg",
      rounds: buildClassBracket(chunk, seedBy),
    };
  });
  return { format: "WEIGHT_CLASS", groups };
}

export function buildHeightClassTournaments(
  players: Player[],
  classCount: number,
  seedBy: SeedBy,
): BracketData | DrawError {
  const missing = players.filter((p) => p.heightCm == null || !Number.isFinite(p.heightCm));
  if (missing.length > 0) {
    return { error: "키급별 토너먼트는 모든 참가자의 키(cm)가 필요합니다." };
  }
  const sorted = [...players].sort((a, b) => (a.heightCm! - b.heightCm!));
  const chunks = splitSortedGroups(sorted, classCount);
  const groups: ClassGroup[] = chunks.map((chunk, i) => {
    const { label, minVal, maxVal } = numericLabel(chunk, "heightCm", "cm", i);
    return {
      label,
      minVal,
      maxVal,
      unit: "cm",
      rounds: buildClassBracket(chunk, seedBy),
    };
  });
  return { format: "HEIGHT_CLASS", groups };
}

export function buildDraw(
  format: DrawFormat,
  players: Player[],
  opts: DrawOptions = {},
): BracketData | DrawError {
  if (players.length === 0) return { error: "참가자가 있어야 대진을 만들 수 있습니다." };

  const seedBy: SeedBy = opts.seedBy ?? "random";
  const split = Math.min(5, Math.max(2, opts.splitClassCount ?? 3));

  if (format === "TOURNAMENT") {
    if (players.length < 2) return { error: "토너먼트는 참가자 2명 이상이 필요합니다." };
    if (seedBy === "weightKg" && players.some((p) => p.weightKg == null || !Number.isFinite(p.weightKg))) {
      return { error: "몸무게 순 시드는 모든 참가자의 몸무게가 필요합니다." };
    }
    if (seedBy === "heightCm" && players.some((p) => p.heightCm == null || !Number.isFinite(p.heightCm))) {
      return { error: "키 순 시드는 모든 참가자의 키가 필요합니다." };
    }
    return buildTournament(players, seedBy);
  }
  if (format === "LEAGUE") {
    if (players.length < 2) return { error: "리그전은 참가자 2명 이상이 필요합니다." };
    if (seedBy === "weightKg" && players.some((p) => p.weightKg == null || !Number.isFinite(p.weightKg))) {
      return { error: "몸무게 순 시드는 모든 참가자의 몸무게가 필요합니다." };
    }
    if (seedBy === "heightCm" && players.some((p) => p.heightCm == null || !Number.isFinite(p.heightCm))) {
      return { error: "키 순 시드는 모든 참가자의 키가 필요합니다." };
    }
    return buildLeague(players, seedBy);
  }
  if (format === "LEAGUE_PHASED") {
    if (players.length < 2) return { error: "예선·본선 리그는 참가자 2명 이상이 필요합니다." };
    if (seedBy === "weightKg" && players.some((p) => p.weightKg == null || !Number.isFinite(p.weightKg))) {
      return { error: "몸무게 순 시드는 모든 참가자의 몸무게가 필요합니다." };
    }
    if (seedBy === "heightCm" && players.some((p) => p.heightCm == null || !Number.isFinite(p.heightCm))) {
      return { error: "키 순 시드는 모든 참가자의 키가 필요합니다." };
    }
    return buildLeaguePhased(players, seedBy);
  }
  if (format === "WEIGHT_CLASS") {
    if (players.length < 1) return { error: "참가자가 필요합니다." };
    return buildWeightClassTournaments(players, split, seedBy);
  }
  if (format === "HEIGHT_CLASS") {
    if (players.length < 1) return { error: "참가자가 필요합니다." };
    return buildHeightClassTournaments(players, split, seedBy);
  }
  return { error: "알 수 없는 경기 방식입니다." };
}

/** 관람용: 라운드·조 순으로 경기를 나열한 순서표 (진행 가능한 대략적 순서) */
export type ScheduledMatchRow = {
  order: number;
  section: string;
  roundTitle: string;
  id: string;
  left: string;
  right: string;
  key?: string;
};

export function collectMatchScheduleOrder(data: BracketData): ScheduledMatchRow[] {
  const rows: ScheduledMatchRow[] = [];
  let order = 0;
  const push = (section: string, roundTitle: string, m: DrawMatch) => {
    order += 1;
    rows.push({
      order,
      section,
      roundTitle,
      id: m.id,
      left: m.left,
      right: m.right,
      key: m.key,
    });
  };

  if (data.format === "TOURNAMENT" || data.format === "LEAGUE") {
    for (const round of data.rounds) {
      for (const m of round.matches) {
        push("", round.title, m);
      }
    }
    return rows;
  }
  if (data.format === "LEAGUE_PHASED") {
    for (const g of data.preliminary) {
      const sec = `${g.groupName}조 예선`;
      for (const round of g.rounds) {
        for (const m of round.matches) {
          push(sec, round.title, m);
        }
      }
    }
    for (const round of data.main) {
      for (const m of round.matches) {
        push("본선", round.title, m);
      }
    }
    return rows;
  }
  if (data.format === "WEIGHT_CLASS" || data.format === "HEIGHT_CLASS") {
    for (const g of data.groups) {
      for (const round of g.rounds) {
        for (const m of round.matches) {
          push(g.label, round.title, m);
        }
      }
    }
    return rows;
  }
  return rows;
}

/** 각 경기에 고유 key 부여 (결과 기록용). 기존 데이터에 key 없으면 재생성 시 자동 부여 */
export function assignMatchKeys(data: BracketData): BracketData {
  const key = () => randomUUID();
  const mapMatches = (matches: DrawMatch[]): DrawMatch[] =>
    matches.map((m) => ({ ...m, key: m.key ?? key() }));

  if (data.format === "TOURNAMENT" || data.format === "LEAGUE") {
    return { ...data, rounds: data.rounds.map((r) => ({ ...r, matches: mapMatches(r.matches) })) };
  }
  if (data.format === "LEAGUE_PHASED") {
    return {
      ...data,
      preliminary: data.preliminary.map((g) => ({
        ...g,
        rounds: g.rounds.map((r) => ({ ...r, matches: mapMatches(r.matches) })),
      })),
      main: data.main.map((r) => ({ ...r, matches: mapMatches(r.matches) })),
    };
  }
  if (data.format === "WEIGHT_CLASS" || data.format === "HEIGHT_CLASS") {
    return {
      ...data,
      groups: data.groups.map((g) => ({
        ...g,
        rounds: g.rounds.map((r) => ({ ...r, matches: mapMatches(r.matches) })),
      })),
    };
  }
  return data;
}

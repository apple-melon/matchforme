export type DrawFormat = "TOURNAMENT" | "LEAGUE" | "LEAGUE_PHASED";

export type Player = { name: string; affiliation: string };

export type DrawMatch = { id: string; left: string; right: string };

export type DrawRound = { title: string; matches: DrawMatch[] };

export type BracketData =
  | { format: "TOURNAMENT"; rounds: DrawRound[] }
  | { format: "LEAGUE"; rounds: DrawRound[] }
  | {
      format: "LEAGUE_PHASED";
      preliminary: { groupName: string; rounds: DrawRound[] }[];
      main: DrawRound[];
    };

export type DrawError = { error: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function fmt(p: Player): string {
  return `[${p.affiliation}] ${p.name}`;
}

type Side =
  | { kind: "p"; name: string; affiliation: string }
  | { kind: "bye" }
  | { kind: "w"; ref: string };

function sideText(s: Side): string {
  if (s.kind === "bye") return "부전승";
  if (s.kind === "p") return fmt({ name: s.name, affiliation: s.affiliation });
  return `${s.ref} 승자`;
}

function slotToSide(s: Player | null | undefined): Side {
  if (!s) return { kind: "bye" };
  return { kind: "p", name: s.name, affiliation: s.affiliation };
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

export function buildTournament(players: Player[]): BracketData | DrawError {
  const shuffled = shuffle(players);
  const n = shuffled.length;
  if (n < 2) return { error: "토너먼트는 참가자 2명 이상이 필요합니다." };

  const exp = Math.ceil(Math.log2(n));
  const size = 2 ** exp;
  const slots: (Player | null)[] = [
    ...shuffled.map((p) => p),
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

export function buildLeague(players: Player[]): BracketData | DrawError {
  const shuffled = shuffle(players);
  const n = shuffled.length;
  if (n < 2) return { error: "리그전은 참가자 2명 이상이 필요합니다." };

  const matches = roundRobinMatches(shuffled, "리그");
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

export function buildLeaguePhased(players: Player[]): BracketData | DrawError {
  const shuffled = shuffle(players);
  const n = shuffled.length;
  if (n < 2) return { error: "예선·본선 리그는 참가자 2명 이상이 필요합니다." };

  const mid = Math.ceil(n / 2);
  const groupA = shuffled.slice(0, mid);
  const groupB = shuffled.slice(mid);

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

export function buildDraw(format: DrawFormat, players: Player[]): BracketData | DrawError {
  if (players.length < 2) return { error: "참가자가 2명 이상일 때 대진을 만들 수 있습니다." };
  if (format === "TOURNAMENT") return buildTournament(players);
  if (format === "LEAGUE") return buildLeague(players);
  return buildLeaguePhased(players);
}

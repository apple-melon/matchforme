import type { BracketData, DrawMatch, DrawRound } from "@/lib/bracket";

export type MatchWinner = "left" | "right";

export type MatchResults = Record<string, MatchWinner>;

export function parseMatchResultsJson(raw: string | null | undefined): MatchResults {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, string>;
    const out: MatchResults = {};
    for (const [k, v] of Object.entries(o)) {
      if (v === "left" || v === "right") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function collectMatchKeys(data: BracketData): Set<string> {
  const keys = new Set<string>();
  const add = (matches: DrawMatch[]) => {
    for (const m of matches) keys.add(m.key ?? m.id);
  };
  if (data.format === "TOURNAMENT" || data.format === "LEAGUE") {
    for (const r of data.rounds) add(r.matches);
  } else if (data.format === "LEAGUE_PHASED") {
    for (const g of data.preliminary) for (const r of g.rounds) add(r.matches);
    for (const r of data.main) add(r.matches);
  } else if (data.format === "WEIGHT_CLASS" || data.format === "HEIGHT_CLASS") {
    for (const g of data.groups) for (const r of g.rounds) add(r.matches);
  }
  return keys;
}

function cloneBracket(data: BracketData): BracketData {
  return JSON.parse(JSON.stringify(data)) as BracketData;
}

/** 한쪽만 부전승인 경기는 승자를 자동 기록 */
export function isByeSideLabel(text: string): boolean {
  const t = text.trim();
  return t === "부전승" || t.startsWith("부전승");
}

function byeFromMatches(matches: DrawMatch[], out: MatchResults) {
  for (const m of matches) {
    const k = m.key ?? m.id;
    const lb = isByeSideLabel(m.left);
    const rb = isByeSideLabel(m.right);
    if (lb && !rb) out[k] = "right";
    else if (rb && !lb) out[k] = "left";
  }
}

export function computeByeAutoResults(data: BracketData): MatchResults {
  const out: MatchResults = {};
  if (data.format === "TOURNAMENT" || data.format === "LEAGUE") {
    for (const r of data.rounds) byeFromMatches(r.matches, out);
  } else if (data.format === "LEAGUE_PHASED") {
    for (const g of data.preliminary) for (const r of g.rounds) byeFromMatches(r.matches, out);
    for (const r of data.main) byeFromMatches(r.matches, out);
  } else if (data.format === "WEIGHT_CLASS" || data.format === "HEIGHT_CLASS") {
    for (const g of data.groups) for (const r of g.rounds) byeFromMatches(r.matches, out);
  }
  return out;
}

/** 운영자가 앞 경기 승자를 기록하면 "N경기 승자" 자리를 실제 이름으로 바꾼 표시용 대진 (원본 JSON은 그대로) */
function resolveInRounds(rounds: DrawRound[], results: MatchResults) {
  const byId = new Map<string, DrawMatch>();
  const orig = new Map<string, { left: string; right: string }>();
  for (const r of rounds) {
    for (const m of r.matches) {
      byId.set(m.id, m);
      orig.set(m.key ?? m.id, { left: m.left, right: m.right });
    }
  }

  function resolveText(text: string, depth = 0): string {
    if (depth > 40) return text;
    const trimmed = text.trim();
    if (isByeSideLabel(trimmed)) return text;
    const winOf = /^(.+?) 승자$/.exec(trimmed);
    if (!winOf) return text;
    const refId = winOf[1]!.trim();
    const src = byId.get(refId);
    if (!src) return text;
    const k = src.key ?? src.id;
    const o = orig.get(k);
    if (!o) return text;
    const w = results[k];
    if (w !== "left" && w !== "right") return text;
    const next = w === "left" ? o.left : o.right;
    return resolveText(next, depth + 1);
  }

  for (const r of rounds) {
    for (const m of r.matches) {
      const snap = orig.get(m.key ?? m.id);
      if (!snap) continue;
      m.left = resolveText(snap.left);
      m.right = resolveText(snap.right);
    }
  }
}

export function resolveBracketDisplayData(data: BracketData, results: MatchResults): BracketData {
  const out = cloneBracket(data);
  if (out.format === "TOURNAMENT" || out.format === "LEAGUE") {
    resolveInRounds(out.rounds, results);
  } else if (out.format === "LEAGUE_PHASED") {
    for (const g of out.preliminary) resolveInRounds(g.rounds, results);
    resolveInRounds(out.main, results);
  } else {
    for (const g of out.groups) resolveInRounds(g.rounds, results);
  }
  return out;
}

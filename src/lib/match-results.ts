import type { BracketData, DrawMatch } from "@/lib/bracket";

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

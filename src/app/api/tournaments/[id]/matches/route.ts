import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { BracketData } from "@/lib/bracket";
import { authorizeTournamentManage } from "@/lib/tournament-access";
import { collectMatchKeys, parseMatchResultsJson, type MatchResults } from "@/lib/match-results";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const { auth, tournament: t } = await authorizeTournamentManage(req, id);
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (!auth.ok) {
    return NextResponse.json({ error: "운영 권한이 없습니다." }, { status: 403 });
  }

  if (!t.bracketJson) {
    return NextResponse.json({ error: "먼저 대진을 생성해 주세요." }, { status: 400 });
  }

  let body: { matchKey: string; winner: "left" | "right" | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.matchKey || typeof body.matchKey !== "string") {
    return NextResponse.json({ error: "matchKey가 필요합니다." }, { status: 400 });
  }

  let bracket: BracketData;
  try {
    bracket = JSON.parse(t.bracketJson) as BracketData;
  } catch {
    return NextResponse.json({ error: "대진 데이터가 손상되었습니다." }, { status: 500 });
  }

  const validKeys = collectMatchKeys(bracket);
  if (!validKeys.has(body.matchKey)) {
    return NextResponse.json({ error: "존재하지 않는 경기입니다." }, { status: 400 });
  }

  if (body.winner !== "left" && body.winner !== "right" && body.winner !== null) {
    return NextResponse.json({ error: "winner는 left, right 또는 null이어야 합니다." }, { status: 400 });
  }

  const current = parseMatchResultsJson(t.matchResultsJson);
  const next: MatchResults = { ...current };
  if (body.winner === null) {
    delete next[body.matchKey];
  } else {
    next[body.matchKey] = body.winner;
  }

  await prisma.tournament.update({
    where: { id },
    data: { matchResultsJson: JSON.stringify(next) },
  });

  return NextResponse.json({ ok: true, matchResults: next });
}

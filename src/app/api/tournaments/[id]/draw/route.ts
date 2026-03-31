import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assignMatchKeys, buildDraw, type DrawFormat, type SeedBy } from "@/lib/bracket";
import { computeByeAutoResults } from "@/lib/match-results";
import { authorizeTournamentManage } from "@/lib/tournament-access";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const { auth, tournament: t0 } = await authorizeTournamentManage(req, id);
  if (!t0) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (!auth.ok) {
    return NextResponse.json({ error: "운영 권한이 없습니다." }, { status: 403 });
  }

  const t = await prisma.tournament.findUnique({
    where: { id },
    include: { participants: true },
  });
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (t.startedAt) {
    return NextResponse.json({ error: "대회가 시작된 후에는 대진을 다시 뽑을 수 없습니다." }, { status: 400 });
  }

  const format = t.format as DrawFormat;
  const players = t.participants.map((p) => ({
    name: p.name,
    affiliation: p.affiliation,
    weightKg: p.weightKg,
    heightCm: p.heightCm,
    age: p.age,
  }));

  const seedBy = (t.seedBy === "weightKg" || t.seedBy === "heightCm" ? t.seedBy : "random") as SeedBy;

  const result = buildDraw(format, players, {
    splitClassCount: t.splitClassCount,
    seedBy,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const withKeys = assignMatchKeys(result);
  const bye = computeByeAutoResults(withKeys);

  await prisma.tournament.update({
    where: { id },
    data: {
      bracketJson: JSON.stringify(withKeys),
      matchResultsJson: Object.keys(bye).length > 0 ? JSON.stringify(bye) : null,
    },
  });

  return NextResponse.json({ ok: true, bracket: withKeys });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { DrawFormat } from "@/lib/bracket";
import { authorizeTournamentManage } from "@/lib/tournament-access";

type Params = { params: Promise<{ id: string }> };

const ALLOWED: DrawFormat[] = [
  "TOURNAMENT",
  "LEAGUE",
  "LEAGUE_PHASED",
  "WEIGHT_CLASS",
  "HEIGHT_CLASS",
];

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const { auth, tournament: t } = await authorizeTournamentManage(req, id);
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (!auth.ok) {
    return NextResponse.json({ error: "운영 권한이 없습니다." }, { status: 403 });
  }

  let format: string | undefined;
  try {
    const body = (await req.json()) as { format?: string };
    format = body.format;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!format || !ALLOWED.includes(format as DrawFormat)) {
    return NextResponse.json({ error: "유효하지 않은 경기 방식입니다." }, { status: 400 });
  }
  if (t.startedAt) {
    return NextResponse.json({ error: "대회가 시작된 후에는 경기 방식을 바꿀 수 없습니다." }, { status: 400 });
  }

  await prisma.tournament.update({
    where: { id },
    data: { format, bracketJson: null, matchResultsJson: null },
  });

  return NextResponse.json({ ok: true, format });
}

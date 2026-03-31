import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeTournamentManage } from "@/lib/tournament-access";

type Params = { params: Promise<{ id: string }> };

/** 대회 시작: 대진이 있을 때만, 이후 경기 결과 입력 가능 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const { auth, tournament: t } = await authorizeTournamentManage(req, id);
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (!auth.ok) {
    return NextResponse.json({ error: "운영 권한이 없습니다." }, { status: 403 });
  }

  if (!t.bracketJson) {
    return NextResponse.json({ error: "먼저 대진을 생성한 뒤 대회를 시작할 수 있습니다." }, { status: 400 });
  }
  if (t.startedAt) {
    return NextResponse.json({ error: "이미 시작된 대회입니다." }, { status: 400 });
  }

  const updated = await prisma.tournament.update({
    where: { id },
    data: { startedAt: new Date() },
    select: { startedAt: true },
  });

  return NextResponse.json({ ok: true, startedAt: updated.startedAt?.toISOString() ?? null });
}

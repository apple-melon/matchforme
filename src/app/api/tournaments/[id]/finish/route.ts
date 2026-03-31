import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeTournamentManage } from "@/lib/tournament-access";

type Params = { params: Promise<{ id: string }> };

/** 대회 종료: 진행 중이던 대회를 마감하고 이후 경기 결과 수정을 막습니다. */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const { auth, tournament: t } = await authorizeTournamentManage(req, id);
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (!auth.ok) {
    return NextResponse.json({ error: "운영 권한이 없습니다." }, { status: 403 });
  }

  if (!t.startedAt) {
    return NextResponse.json({ error: "아직 시작되지 않은 대회입니다. 먼저 대회를 시작해 주세요." }, { status: 400 });
  }
  if (t.endedAt) {
    return NextResponse.json({ error: "이미 종료된 대회입니다." }, { status: 400 });
  }

  const updated = await prisma.tournament.update({
    where: { id },
    data: { endedAt: new Date() },
    select: { endedAt: true },
  });

  return NextResponse.json({ ok: true, endedAt: updated.endedAt?.toISOString() ?? null });
}

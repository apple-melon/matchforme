import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeTournamentManage } from "@/lib/tournament-access";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const { auth, tournament: t } = await authorizeTournamentManage(req, id);
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (!auth.ok) {
    return NextResponse.json({ error: "운영 권한이 없습니다." }, { status: 403 });
  }
  if (t.startedAt) {
    return NextResponse.json({ error: "대회가 시작된 후에는 참가자를 삭제할 수 없습니다." }, { status: 400 });
  }

  let ids: string[] | undefined;
  let all = false;
  try {
    const body = (await req.json()) as { ids?: string[]; all?: boolean };
    ids = body.ids;
    all = Boolean(body.all);
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (all) {
    await prisma.participant.deleteMany({ where: { tournamentId: id } });
    await prisma.tournament.update({
      where: { id },
      data: { bracketJson: null, matchResultsJson: null },
    });
    return NextResponse.json({ ok: true, deleted: "all" });
  }

  if (!ids?.length) {
    return NextResponse.json({ error: "삭제할 참가자를 선택해 주세요." }, { status: 400 });
  }

  const safeIds = ids.filter((x) => typeof x === "string" && x.length > 0);
  await prisma.participant.deleteMany({
    where: { tournamentId: id, id: { in: safeIds } },
  });
  await prisma.tournament.update({
    where: { id },
    data: { bracketJson: null, matchResultsJson: null },
  });

  return NextResponse.json({ ok: true, deleted: safeIds.length });
}

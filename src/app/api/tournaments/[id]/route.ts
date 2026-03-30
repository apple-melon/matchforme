import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeTournamentManage } from "@/lib/tournament-access";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const { auth, tournament: t } = await authorizeTournamentManage(req, id);
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (!auth.ok) {
    return NextResponse.json({ error: "운영 권한이 없습니다." }, { status: 403 });
  }

  const participants = await prisma.participant.findMany({
    where: { tournamentId: id },
    orderBy: [{ affiliation: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    id: t.id,
    code: t.code,
    title: t.title,
    format: t.format,
    bracketJson: t.bracketJson,
    matchResultsJson: t.matchResultsJson,
    collectedFieldsJson: t.collectedFieldsJson,
    splitClassCount: t.splitClassCount,
    seedBy: t.seedBy,
    ownerId: t.ownerId,
    isOwner: auth.via === "owner",
    participants: participants.map((p) => ({
      id: p.id,
      name: p.name,
      affiliation: p.affiliation,
      weightKg: p.weightKg,
      heightCm: p.heightCm,
      age: p.age,
      createdAt: p.createdAt,
    })),
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const { auth, tournament: t } = await authorizeTournamentManage(req, id);
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (!auth.ok) {
    return NextResponse.json({ error: "운영 권한이 없습니다." }, { status: 403 });
  }
  if (auth.via !== "owner") {
    return NextResponse.json(
      { error: "대회 삭제는 로그인한 주최자만 할 수 있습니다. 비밀 링크만으로는 삭제할 수 없습니다." },
      { status: 403 },
    );
  }

  await prisma.tournament.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

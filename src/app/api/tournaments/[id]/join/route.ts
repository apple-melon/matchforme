import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  let name = "";
  let affiliation = "";
  try {
    const body = (await req.json()) as { name?: string; affiliation?: string };
    name = (body.name ?? "").trim().slice(0, 80);
    affiliation = (body.affiliation ?? "").trim().slice(0, 80);
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!name || !affiliation) {
    return NextResponse.json({ error: "이름과 소속을 모두 입력해 주세요." }, { status: 400 });
  }

  const t = await prisma.tournament.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });

  const p = await prisma.participant.create({
    data: { tournamentId: id, name, affiliation },
  });

  return NextResponse.json({
    id: p.id,
    name: p.name,
    affiliation: p.affiliation,
  });
}

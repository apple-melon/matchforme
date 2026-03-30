import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { code } = await params;
  const upper = code.trim().toUpperCase();
  const t = await prisma.tournament.findUnique({
    where: { code: upper },
    select: { id: true, code: true, title: true, _count: { select: { participants: true } } },
  });
  if (!t) {
    return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({
    id: t.id,
    code: t.code,
    title: t.title,
    participantCount: t._count.participants,
  });
}

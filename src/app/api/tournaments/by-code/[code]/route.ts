import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { code } = await params;
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    return NextResponse.json({ error: "6자리 숫자 코드를 입력해 주세요." }, { status: 400 });
  }

  const t = await prisma.tournament.findUnique({
    where: { code: trimmed },
    select: {
      id: true,
      code: true,
      title: true,
      collectedFieldsJson: true,
      startedAt: true,
      _count: { select: { participants: true } },
    },
  });
  if (!t) {
    return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({
    id: t.id,
    code: t.code,
    title: t.title,
    participantCount: t._count.participants,
    collectedFieldsJson: t.collectedFieldsJson,
    startedAt: t.startedAt ? t.startedAt.toISOString() : null,
  });
}

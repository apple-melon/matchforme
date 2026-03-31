import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ code: string }> };

/** 참가자·관람용 공개 정보 (비밀키 없음) */
export async function GET(_req: Request, { params }: Params) {
  const { code } = await params;
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    return NextResponse.json({ error: "올바른 6자리 숫자 코드가 아닙니다." }, { status: 400 });
  }

  const t = await prisma.tournament.findUnique({
    where: { code: trimmed },
    select: {
      id: true,
      code: true,
      title: true,
      format: true,
      bracketJson: true,
      matchResultsJson: true,
      startedAt: true,
      endedAt: true,
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
    format: t.format,
    bracketJson: t.bracketJson,
    matchResultsJson: t.matchResultsJson,
    startedAt: t.startedAt ? t.startedAt.toISOString() : null,
    endedAt: t.endedAt ? t.endedAt.toISOString() : null,
    participantCount: t._count.participants,
  });
}

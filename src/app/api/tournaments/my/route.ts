import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/session";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const list = await prisma.tournament.findMany({
    where: { ownerId: session.sub },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      title: true,
      createdAt: true,
      startedAt: true,
      endedAt: true,
      _count: { select: { participants: true } },
    },
  });

  return NextResponse.json({
    tournaments: list.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      createdAt: t.createdAt,
      startedAt: t.startedAt,
      endedAt: t.endedAt,
      participantCount: t._count.participants,
    })),
  });
}

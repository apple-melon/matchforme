import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/session";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rows = await prisma.participant.findMany({
    where: { userId: session.sub },
    include: {
      tournament: {
        select: {
          id: true,
          code: true,
          title: true,
          bracketJson: true,
          matchResultsJson: true,
          format: true,
          startedAt: true,
          endedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      participantId: r.id,
      name: r.name,
      affiliation: r.affiliation,
      tournament: {
        id: r.tournament.id,
        code: r.tournament.code,
        title: r.tournament.title,
        format: r.tournament.format,
        hasBracket: Boolean(r.tournament.bracketJson),
        matchResultsJson: r.tournament.matchResultsJson,
        startedAt: r.tournament.startedAt ? r.tournament.startedAt.toISOString() : null,
        endedAt: r.tournament.endedAt ? r.tournament.endedAt.toISOString() : null,
      },
    })),
  });
}

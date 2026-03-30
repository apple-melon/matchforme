import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { randomTournamentCode } from "@/lib/tournament-code";

export async function POST(req: Request) {
  let title = "";
  try {
    const body = (await req.json()) as { title?: string };
    title = (body.title ?? "").trim().slice(0, 120);
  } catch {
    title = "";
  }

  const adminSecret = randomUUID();

  for (let attempt = 0; attempt < 30; attempt++) {
    const code = randomTournamentCode(6);
    try {
      const t = await prisma.tournament.create({
        data: { code, adminSecret, title: title || "무제 대회" },
      });
      return NextResponse.json({
        id: t.id,
        code: t.code,
        adminSecret: t.adminSecret,
        title: t.title,
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "대회 코드 생성에 실패했습니다. 다시 시도해 주세요." }, { status: 500 });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildDraw, type DrawFormat } from "@/lib/bracket";

type Params = { params: Promise<{ id: string }> };

function requireSecret(req: Request, expected: string) {
  return req.headers.get("x-admin-secret") === expected;
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const t = await prisma.tournament.findUnique({
    where: { id },
    include: { participants: true },
  });
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (!requireSecret(req, t.adminSecret)) {
    return NextResponse.json({ error: "운영 권한이 없습니다." }, { status: 403 });
  }

  const format = t.format as DrawFormat;
  const players = t.participants.map((p) => ({
    name: p.name,
    affiliation: p.affiliation,
  }));

  const result = buildDraw(format, players);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await prisma.tournament.update({
    where: { id },
    data: { bracketJson: JSON.stringify(result) },
  });

  return NextResponse.json({ ok: true, bracket: result });
}

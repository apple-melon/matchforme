import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { DrawFormat } from "@/lib/bracket";

type Params = { params: Promise<{ id: string }> };

const ALLOWED: DrawFormat[] = [
  "TOURNAMENT",
  "LEAGUE",
  "LEAGUE_PHASED",
  "WEIGHT_CLASS",
  "HEIGHT_CLASS",
];

function requireSecret(req: Request, expected: string) {
  return req.headers.get("x-admin-secret") === expected;
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const t = await prisma.tournament.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (!requireSecret(req, t.adminSecret)) {
    return NextResponse.json({ error: "운영 권한이 없습니다." }, { status: 403 });
  }

  let format: string | undefined;
  try {
    const body = (await req.json()) as { format?: string };
    format = body.format;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!format || !ALLOWED.includes(format as DrawFormat)) {
    return NextResponse.json({ error: "유효하지 않은 경기 방식입니다." }, { status: 400 });
  }

  await prisma.tournament.update({
    where: { id },
    data: { format, bracketJson: null },
  });

  return NextResponse.json({ ok: true, format });
}

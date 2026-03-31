import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { SeedBy } from "@/lib/bracket";
import { authorizeTournamentManage } from "@/lib/tournament-access";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_SEED: SeedBy[] = ["random", "weightKg", "heightCm"];

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const { auth, tournament: t } = await authorizeTournamentManage(req, id);
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (!auth.ok) {
    return NextResponse.json({ error: "운영 권한이 없습니다." }, { status: 403 });
  }
  if (t.startedAt) {
    return NextResponse.json({ error: "대회가 시작된 후에는 시드·조 개수를 바꿀 수 없습니다." }, { status: 400 });
  }

  let body: {
    splitClassCount?: number;
    seedBy?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const data: {
    splitClassCount?: number;
    seedBy?: string;
  } = {};

  if (body.splitClassCount !== undefined) {
    const n = Number(body.splitClassCount);
    if (!Number.isInteger(n) || n < 2 || n > 5) {
      return NextResponse.json({ error: "체급 수는 2~5 사이 정수여야 합니다." }, { status: 400 });
    }
    data.splitClassCount = n;
  }

  if (body.seedBy !== undefined) {
    if (!ALLOWED_SEED.includes(body.seedBy as SeedBy)) {
      return NextResponse.json({ error: "유효하지 않은 시드 방식입니다." }, { status: 400 });
    }
    data.seedBy = body.seedBy;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  await prisma.tournament.update({
    where: { id },
    data: { ...data, bracketJson: null, matchResultsJson: null },
  });

  return NextResponse.json({ ok: true, ...data });
}

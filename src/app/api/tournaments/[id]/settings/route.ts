import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  PARTICIPANT_FIELD_OPTIONS,
  type ParticipantFieldKey,
  serializeCollectedFields,
} from "@/lib/participant-fields";
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

  let body: {
    collectedFields?: string[];
    splitClassCount?: number;
    seedBy?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const allowedKeys = new Set(PARTICIPANT_FIELD_OPTIONS.map((o) => o.key));
  const data: {
    collectedFieldsJson?: string;
    splitClassCount?: number;
    seedBy?: string;
  } = {};

  if (body.collectedFields !== undefined) {
    if (!Array.isArray(body.collectedFields)) {
      return NextResponse.json({ error: "collectedFields는 배열이어야 합니다." }, { status: 400 });
    }
    const cleaned = body.collectedFields.filter(
      (k): k is ParticipantFieldKey => typeof k === "string" && allowedKeys.has(k as ParticipantFieldKey),
    );
    data.collectedFieldsJson = serializeCollectedFields(cleaned);
  }

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

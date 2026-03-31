import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { parseCollectedFieldsJson, serializeCollectedFields } from "@/lib/participant-fields";
import { randomNumericTournamentCode } from "@/lib/tournament-code";
import { getSessionFromCookies } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "대회를 만들려면 로그인해 주세요." }, { status: 401 });
  }

  let title = "";
  let collectedFieldsJson = "[]";
  try {
    const body = (await req.json()) as { title?: string; collectedFields?: string[] };
    title = (body.title ?? "").trim().slice(0, 120);
    if (body.collectedFields !== undefined) {
      if (!Array.isArray(body.collectedFields)) {
        return NextResponse.json({ error: "collectedFields는 배열이어야 합니다." }, { status: 400 });
      }
      const asJson = JSON.stringify(body.collectedFields);
      const cleaned = parseCollectedFieldsJson(asJson);
      collectedFieldsJson = serializeCollectedFields(cleaned);
    }
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const adminSecret = randomUUID();

  for (let attempt = 0; attempt < 40; attempt++) {
    const code = randomNumericTournamentCode();
    try {
      const t = await prisma.tournament.create({
        data: {
          code,
          adminSecret,
          title: title || "무제 대회",
          ownerId: session.sub,
          collectedFieldsJson,
        },
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

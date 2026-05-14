import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCollectedFieldsJson } from "@/lib/participant-fields";
import { getSessionFromCookies } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  let name = "";
  let affiliation = "";
  let weightKg: number | undefined;
  let heightCm: number | undefined;
  let age: number | undefined;
  try {
    const body = (await req.json()) as {
      name?: string;
      affiliation?: string;
      weightKg?: number;
      heightCm?: number;
      age?: number;
    };
    name = (body.name ?? "").trim().slice(0, 80);
    affiliation = (body.affiliation ?? "").trim().slice(0, 80);
    if (body.weightKg != null && Number.isFinite(Number(body.weightKg))) weightKg = Number(body.weightKg);
    if (body.heightCm != null && Number.isFinite(Number(body.heightCm))) heightCm = Number(body.heightCm);
    if (body.age != null && Number.isFinite(Number(body.age))) age = Math.round(Number(body.age));
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
  }

  const t = await prisma.tournament.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (t.startedAt) {
    return NextResponse.json({ error: "이미 시작된 대회에는 참가 신청을 받지 않습니다." }, { status: 400 });
  }

  const wanted = parseCollectedFieldsJson(t.collectedFieldsJson);
  if (wanted.includes("affiliation") && !affiliation.trim()) {
    return NextResponse.json({ error: "소속을 입력해 주세요." }, { status: 400 });
  }
  if (!wanted.includes("affiliation")) {
    affiliation = "";
  }
  if (wanted.includes("weightKg") && (weightKg == null || weightKg <= 0 || weightKg > 500)) {
    return NextResponse.json({ error: "몸무게(kg)를 올바르게 입력해 주세요." }, { status: 400 });
  }
  if (wanted.includes("heightCm") && (heightCm == null || heightCm <= 0 || heightCm > 300)) {
    return NextResponse.json({ error: "키(cm)를 올바르게 입력해 주세요." }, { status: 400 });
  }
  if (wanted.includes("age") && (age == null || age < 0 || age > 150)) {
    return NextResponse.json({ error: "나이를 올바르게 입력해 주세요." }, { status: 400 });
  }

  const session = await getSessionFromCookies();

  const p = await prisma.participant.create({
    data: {
      tournamentId: id,
      userId: session?.sub ?? null,
      name,
      affiliation,
      weightKg: wanted.includes("weightKg") ? weightKg : null,
      heightCm: wanted.includes("heightCm") ? heightCm : null,
      age: wanted.includes("age") ? age : null,
    },
  });

  // 대회 주최자에게 참가 알림
  if (t.ownerId) {
    await prisma.notification.create({
      data: {
        userId: t.ownerId,
        type: "PARTICIPANT_JOINED",
        title: "새 참가자 등록",
        body: `${name}님이 「${t.title || "무제 대회"}」에 참가했습니다.`,
        link: `/manage/${t.id}`,
      },
    }).catch(() => {}); // 알림 실패가 참가 등록을 막지 않도록
  }

  return NextResponse.json({
    id: p.id,
    name: p.name,
    affiliation: p.affiliation,
    weightKg: p.weightKg,
    heightCm: p.heightCm,
    age: p.age,
  });
}

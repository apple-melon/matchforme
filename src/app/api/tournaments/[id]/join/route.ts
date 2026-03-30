import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCollectedFieldsJson } from "@/lib/participant-fields";

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

  if (!name || !affiliation) {
    return NextResponse.json({ error: "이름과 소속을 모두 입력해 주세요." }, { status: 400 });
  }

  const t = await prisma.tournament.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });

  const wanted = parseCollectedFieldsJson(t.collectedFieldsJson);
  if (wanted.includes("weightKg") && (weightKg == null || weightKg <= 0 || weightKg > 500)) {
    return NextResponse.json({ error: "몸무게(kg)를 올바르게 입력해 주세요." }, { status: 400 });
  }
  if (wanted.includes("heightCm") && (heightCm == null || heightCm <= 0 || heightCm > 300)) {
    return NextResponse.json({ error: "키(cm)를 올바르게 입력해 주세요." }, { status: 400 });
  }
  if (wanted.includes("age") && (age == null || age < 0 || age > 150)) {
    return NextResponse.json({ error: "나이를 올바르게 입력해 주세요." }, { status: 400 });
  }

  const p = await prisma.participant.create({
    data: {
      tournamentId: id,
      name,
      affiliation,
      weightKg: wanted.includes("weightKg") ? weightKg : null,
      heightCm: wanted.includes("heightCm") ? heightCm : null,
      age: wanted.includes("age") ? age : null,
    },
  });

  return NextResponse.json({
    id: p.id,
    name: p.name,
    affiliation: p.affiliation,
    weightKg: p.weightKg,
    heightCm: p.heightCm,
    age: p.age,
  });
}

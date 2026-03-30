import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

function requireSecret(req: Request, expected: string) {
  const h = req.headers.get("x-admin-secret");
  return h === expected;
}

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const t = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: [{ affiliation: "asc" }, { name: "asc" }],
      },
    },
  });
  if (!t) return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  if (!requireSecret(req, t.adminSecret)) {
    return NextResponse.json({ error: "운영 권한이 없습니다." }, { status: 403 });
  }

  return NextResponse.json({
    id: t.id,
    code: t.code,
    title: t.title,
    format: t.format,
    bracketJson: t.bracketJson,
    collectedFieldsJson: t.collectedFieldsJson,
    splitClassCount: t.splitClassCount,
    seedBy: t.seedBy,
    participants: t.participants.map((p) => ({
      id: p.id,
      name: p.name,
      affiliation: p.affiliation,
      weightKg: p.weightKg,
      heightCm: p.heightCm,
      age: p.age,
      createdAt: p.createdAt,
    })),
  });
}

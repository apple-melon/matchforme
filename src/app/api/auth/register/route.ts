import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { setSessionCookie, signSession } from "@/lib/session";

export async function POST(req: Request) {
  let email = "";
  let password = "";
  let name = "";
  try {
    const body = (await req.json()) as { email?: string; password?: string; name?: string };
    email = (body.email ?? "").trim().toLowerCase();
    password = body.password ?? "";
    name = (body.name ?? "").trim().slice(0, 80);
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name: name || null },
  });

  const token = await signSession(user.id, user.email);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
}

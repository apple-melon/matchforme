import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/** 로그인·회원가입 등 인증 API에서 예외를 사용자용 메시지로 변환 */
export function jsonFromAuthError(e: unknown, context: "login" | "register"): NextResponse {
  console.error(`[auth/${context}]`, e);

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
    }
    if (e.code === "P2021" || e.code === "P2010") {
      return NextResponse.json(
        {
          error:
            "데이터베이스 테이블이 준비되지 않았습니다. 서버에서 `npx prisma migrate deploy`를 실행했는지 확인해 주세요.",
        },
        { status: 500 },
      );
    }
    if (e.code === "P1001") {
      return NextResponse.json(
        { error: "데이터베이스에 연결할 수 없습니다. DATABASE_URL을 확인해 주세요." },
        { status: 500 },
      );
    }
  }

  if (e instanceof Error) {
    const msg = e.message;
    if (msg.includes("SESSION_SECRET") || msg.includes("DATABASE_URL")) {
      return NextResponse.json(
        {
          error:
            "서버 환경 설정이 필요합니다. DATABASE_URL 또는 SESSION_SECRET(16자 이상)을 확인해 주세요.",
        },
        { status: 500 },
      );
    }
  }

  const fallback =
    context === "register"
      ? "회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      : "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  return NextResponse.json({ error: fallback }, { status: 500 });
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function onCodeInput(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 6);
    setCode(d);
  }

  function goJoin() {
    if (code.length !== 6) {
      setErr("6자리 숫자 코드를 입력해 주세요.");
      return;
    }
    setErr(null);
    router.push(`/join/${code}`);
  }

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col gap-10 px-4 py-16">
      <header className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">대진표 · 토너먼트 · 리그</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">MATCH FOR ME</h1>
        <p className="text-sm leading-relaxed text-muted">
          대회를 만들고 6자리 숫자 코드로 선수를 모은 뒤, 토너먼트·리그·예선+본선으로 대진을 짜고 승패를 기록할 수
          있습니다.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/create"
          className="rounded-2xl border border-card-border bg-card p-5 text-center shadow-sm transition hover:border-amber-500/50"
        >
          <span className="block text-sm font-semibold text-foreground">대회 만들기</span>
          <span className="mt-1 block text-xs text-muted">로그인 후 새 대회 (운영·참가 코드 발급)</span>
        </Link>
        <Link
          href="/my"
          className="rounded-2xl border border-card-border bg-card p-5 text-center shadow-sm transition hover:border-amber-500/50"
        >
          <span className="block text-sm font-semibold text-foreground">내 대회 · 내 참가</span>
          <span className="mt-1 block text-xs text-muted">주최·참가 목록과 진행 상황</span>
        </Link>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">참가하기</h2>
        <p className="mt-1 text-sm text-muted">주최자가 알려준 6자리 숫자 코드를 입력하세요.</p>
        <input
          value={code}
          onChange={(e) => onCodeInput(e.target.value)}
          placeholder="예: 482913"
          inputMode="numeric"
          maxLength={6}
          className="mt-4 w-full rounded-lg border border-card-border bg-background px-3 py-3 text-center font-mono text-2xl tracking-[0.3em] text-foreground outline-none ring-amber-500/40 focus:ring-2"
        />
        <button
          type="button"
          onClick={goJoin}
          className="mt-4 w-full rounded-lg border border-card-border py-2.5 text-sm font-semibold text-foreground hover:bg-background"
        >
          참가 페이지로 이동
        </button>
      </section>

      <section className="flex flex-wrap justify-center gap-4 text-sm text-muted">
        <Link href="/login" className="text-amber-600 underline">
          로그인
        </Link>
        <Link href="/register" className="underline">
          회원가입
        </Link>
      </section>

      {err ? <p className="text-center text-sm text-red-600 dark:text-red-400">{err}</p> : null}

      <p className="text-center text-xs text-muted">
        진행 상황만 보려면 주소에 <span className="font-mono text-foreground">/t/여섯자리숫자</span>로 접속하면 됩니다.
      </p>
    </div>
  );
}

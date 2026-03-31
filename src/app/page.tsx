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
      <header className="ui-motion-enter space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">대진표 · 토너먼트 · 리그</p>
        <h1 className="flex items-center justify-center gap-2 text-3xl font-bold tracking-tight text-foreground">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent shadow-sm shadow-accent/30" aria-hidden />
          MATCH FOR ME
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          대회를 만들고 6자리 숫자 코드로 선수를 모은 뒤, 토너먼트·리그·예선+본선으로 대진을 짜고 승패를 기록할 수
          있습니다.
        </p>
      </header>

      <section className="ui-motion-enter ui-motion-delay-1">
        <Link
          href="/create"
          className="ui-card-lift block rounded-2xl border border-accent/25 bg-card p-5 text-center shadow-sm hover:border-accent/45"
        >
          <span className="block text-sm font-semibold text-foreground">대회 만들기</span>
          <span className="mt-1 block text-xs text-muted">로그인 후 새 대회 (운영·참가 코드 발급)</span>
        </Link>
      </section>

      <section className="ui-motion-enter ui-motion-delay-2 rounded-2xl border border-card-border bg-card p-6 shadow-sm transition-[box-shadow,border-color] duration-300 hover:border-card-border/80">
        <h2 className="text-lg font-semibold text-foreground">참가하기</h2>
        <p className="mt-1 text-sm text-muted">주최자가 알려준 6자리 숫자 코드를 입력하세요.</p>
        <input
          value={code}
          onChange={(e) => onCodeInput(e.target.value)}
          placeholder="예: 482913"
          inputMode="numeric"
          maxLength={6}
          className="mt-4 w-full rounded-lg border border-card-border bg-background px-3 py-3 text-center font-mono text-2xl tracking-[0.3em] text-foreground outline-none ring-accent/35 transition-[border-color,box-shadow] duration-200 focus:border-accent/40 focus:ring-2"
        />
        <button
          type="button"
          onClick={goJoin}
          className="mt-4 w-full rounded-lg border border-accent/30 bg-accent-soft py-2.5 text-sm font-semibold text-accent transition-[background-color,transform,box-shadow] duration-200 hover:bg-accent/15 active:scale-[0.99] dark:hover:bg-accent/20"
        >
          참가 페이지로 이동
        </button>
      </section>

      <section className="ui-motion-enter ui-motion-delay-3 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="inline-flex min-w-[7.5rem] items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg shadow-sm transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          로그인
        </Link>
        <Link
          href="/register"
          className="inline-flex min-w-[7.5rem] items-center justify-center rounded-lg border-2 border-accent bg-accent-soft px-5 py-2.5 text-sm font-semibold text-accent transition-[background-color,transform,border-color] duration-200 hover:bg-accent/15 active:scale-[0.98] dark:hover:bg-accent/25"
        >
          회원가입
        </Link>
      </section>

      {err ? (
        <p className="ui-fade-quick text-center text-sm text-red-600 dark:text-red-400">{err}</p>
      ) : null}

      <p className="ui-motion-enter ui-motion-delay-4 text-center text-xs text-muted">
        진행 상황만 보려면 주소에 <span className="font-mono text-foreground">/t/여섯자리숫자</span>로 접속하면 됩니다.
      </p>
    </div>
  );
}

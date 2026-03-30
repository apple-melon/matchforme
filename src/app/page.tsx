"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Created = { id: string; code: string; title: string; adminSecret: string };

function downloadOperatorBundle(c: Created) {
  const origin = window.location.origin;
  const manage = `${origin}/manage/${c.id}?k=${encodeURIComponent(c.adminSecret)}`;
  const join = `${origin}/join/${c.code}`;
  const text = [
    "MATCH FOR ME — 대회 운영 정보 (분실 시 복구 불가)",
    "",
    `대회명: ${c.title}`,
    `참가 코드: ${c.code}`,
    "",
    "[참가 링크 — 선수에게 공유]",
    join,
    "",
    "[운영 링크 — 주최자만 보관]",
    manage,
    "",
    "이 파일과 운영 링크는 타인에게 공유하지 마세요.",
  ].join("\n");

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `MATCH-FOR-ME-운영정보-${c.code}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  async function createTournament() {
    setErr(null);
    setCreating(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined }),
      });
      const data = (await res.json()) as {
        id?: string;
        code?: string;
        title?: string;
        adminSecret?: string;
        error?: string;
      };
      if (!res.ok) {
        setErr(data.error ?? "대회를 만들 수 없습니다.");
        return;
      }
      if (data.id && data.adminSecret && data.code) {
        sessionStorage.setItem(`bracket_admin_${data.id}`, data.adminSecret);
        setCreated({
          id: data.id,
          code: data.code,
          title: data.title ?? "무제 대회",
          adminSecret: data.adminSecret,
        });
      }
    } finally {
      setCreating(false);
    }
  }

  function goManage() {
    if (!created) return;
    router.push(`/manage/${created.id}`);
  }

  function goJoin() {
    const c = code.trim().toUpperCase();
    if (!c) {
      setErr("참가 코드를 입력해 주세요.");
      return;
    }
    setErr(null);
    router.push(`/join/${c}`);
  }

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col gap-10 px-4 py-16">
      <header className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">대진표 · 토너먼트 · 리그</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">MATCH FOR ME</h1>
        <p className="text-sm leading-relaxed text-muted">
          대회를 만들고 참가 코드로 선수를 모은 뒤, 토너먼트·리그·예선+본선 방식으로 대진을 뽑을 수 있습니다.
        </p>
      </header>

      {created ? (
        <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">대회가 만들어졌습니다</h2>
          <p className="mt-1 text-sm text-muted">{created.title}</p>
          <p className="mt-4 text-xs font-medium uppercase text-muted">참가 코드 (선수들에게 공유)</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-foreground">{created.code}</p>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            운영 링크는 분실 시 복구할 수 없습니다. 아래에서 텍스트 파일로 저장해 두세요.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => downloadOperatorBundle(created)}
              className="w-full rounded-lg border border-amber-600/40 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-amber-500/25 dark:border-amber-500/50 dark:bg-amber-500/10"
            >
              운영·참가 링크.txt 다운로드
            </button>
            <button
              type="button"
              onClick={goManage}
              className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-amber-400"
            >
              운영 페이지로 이동
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">대회 만들기</h2>
          <p className="mt-1 text-sm text-muted">운영 전용 링크와 참가 코드가 발급됩니다.</p>
          <label className="mt-4 block text-sm font-medium text-foreground">
            대회 이름 (선택)
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026 봄 친선전"
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-foreground outline-none ring-amber-500/40 focus:ring-2"
            />
          </label>
          <button
            type="button"
            onClick={() => void createTournament()}
            disabled={creating}
            className="mt-4 w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-amber-400 disabled:opacity-60"
          >
            {creating ? "만드는 중…" : "대회 만들기"}
          </button>
        </section>
      )}

      <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">참가하기</h2>
        <p className="mt-1 text-sm text-muted">주최자가 알려준 코드를 입력하세요.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="예: X7K2M9"
          maxLength={8}
          className="mt-4 w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-foreground outline-none ring-amber-500/40 focus:ring-2"
        />
        <button
          type="button"
          onClick={goJoin}
          className="mt-4 w-full rounded-lg border border-card-border py-2.5 text-sm font-semibold text-foreground hover:bg-background"
        >
          참가 페이지로 이동
        </button>
      </section>

      {err ? <p className="text-center text-sm text-red-600 dark:text-red-400">{err}</p> : null}

      <p className="text-center text-xs text-muted">
        운영자는 대회 생성 후 링크를 안전하게 보관하세요.{" "}
        <Link href="/" className="underline underline-offset-2">
          새로고침
        </Link>
      </p>
    </div>
  );
}

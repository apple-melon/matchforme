"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; code: string; title: string } | null>(null);

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
        setCreated({ id: data.id, code: data.code, title: data.title ?? "무제 대회" });
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
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">대진표</h1>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          대회를 만들고 참가 코드로 선수를 모은 뒤, 토너먼트·리그·예선+본선 방식으로 대진을 뽑을 수 있습니다.
        </p>
      </header>

      {created ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/40">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">대회가 만들어졌습니다</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{created.title}</p>
          <p className="mt-4 text-xs font-medium uppercase text-zinc-500">참가 코드 (선수들에게 공유)</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-zinc-900 dark:text-zinc-50">
            {created.code}
          </p>
          <p className="mt-4 text-xs text-zinc-500">
            운영 페이지에서 참가 링크·운영 링크를 복사할 수 있습니다. 운영 링크는 분실하면 복구할 수 없습니다.
          </p>
          <button
            type="button"
            onClick={goManage}
            className="mt-6 w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-amber-400"
          >
            운영 페이지로 이동
          </button>
        </section>
      ) : (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">대회 만들기</h2>
          <p className="mt-1 text-sm text-zinc-500">운영 전용 링크와 참가 코드가 발급됩니다.</p>
          <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            대회 이름 (선택)
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026 봄 친선전"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-amber-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
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

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">참가하기</h2>
        <p className="mt-1 text-sm text-zinc-500">주최자가 알려준 코드를 입력하세요.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="예: X7K2M9"
          maxLength={8}
          className="mt-4 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-zinc-900 outline-none ring-amber-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={goJoin}
          className="mt-4 w-full rounded-lg border border-zinc-300 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          참가 페이지로 이동
        </button>
      </section>

      {err ? <p className="text-center text-sm text-red-600 dark:text-red-400">{err}</p> : null}

      <p className="text-center text-xs text-zinc-400">
        운영자는 대회 생성 후 표시되는 링크를 잘 보관하세요.{" "}
        <Link href="/" className="underline">
          새로고침
        </Link>
      </p>
    </div>
  );
}

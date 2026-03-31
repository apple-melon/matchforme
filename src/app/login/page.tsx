"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/profile";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "로그인에 실패했습니다.");
        return;
      }
      router.push(next.startsWith("/") ? next : "/profile");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-foreground">로그인</h1>
      <p className="mt-1 text-sm text-muted">주최한 대회를 다시 열거나, 참가한 대회 진행을 보려면 로그인하세요.</p>
      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4 rounded-2xl border border-card-border bg-card p-6">
        <label className="block text-sm font-medium">
          이메일
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 outline-none ring-amber-500/40 focus:ring-2"
          />
        </label>
        <label className="block text-sm font-medium">
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 outline-none ring-amber-500/40 focus:ring-2"
          />
        </label>
        {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-60"
        >
          {busy ? "처리 중…" : "로그인"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        계정이 없으면{" "}
        <Link href="/register" className="text-amber-600 underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted">불러오는 중…</div>}>
      <LoginForm />
    </Suspense>
  );
}

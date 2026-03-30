"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() || undefined }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "가입에 실패했습니다.");
        return;
      }
      router.push("/my");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-foreground">회원가입</h1>
      <p className="mt-1 text-sm text-muted">대회를 만들거나, 로그인 후 참가하면 진행 상황을 모아 볼 수 있습니다.</p>
      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4 rounded-2xl border border-card-border bg-card p-6">
        <label className="block text-sm font-medium">
          이름 (선택)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 outline-none ring-amber-500/40 focus:ring-2"
          />
        </label>
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
          비밀번호 (6자 이상)
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
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
          {busy ? "처리 중…" : "가입하기"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        이미 계정이 있으면{" "}
        <Link href="/login" className="text-amber-600 underline">
          로그인
        </Link>
      </p>
    </div>
  );
}

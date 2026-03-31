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
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() || undefined }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "가입에 실패했습니다.");
        return;
      }
      setOk("회원가입이 완료되었습니다. 잠시 후 프로필 페이지로 이동합니다.");
      setTimeout(() => {
        router.push("/profile");
        router.refresh();
      }, 1200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ui-motion-enter mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-foreground">회원가입</h1>
      <p className="mt-1 text-sm text-muted">대회를 만들거나, 로그인 후 참가하면 진행 상황을 모아 볼 수 있습니다.</p>
      <form
        onSubmit={(e) => void submit(e)}
        className="ui-motion-enter ui-motion-delay-1 mt-8 space-y-4 rounded-2xl border border-card-border bg-card p-6 shadow-sm transition-[box-shadow] duration-300 hover:shadow-md"
      >
        <label className="block text-sm font-medium">
          이름 (선택)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 outline-none ring-accent/35 transition-[border-color,box-shadow] duration-200 focus:ring-2"
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
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 outline-none ring-accent/35 transition-[border-color,box-shadow] duration-200 focus:ring-2"
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
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 outline-none ring-accent/35 transition-[border-color,box-shadow] duration-200 focus:ring-2"
          />
        </label>
        {err ? <p className="ui-fade-quick text-sm text-red-600 dark:text-red-400">{err}</p> : null}
        {ok ? <p className="ui-fade-quick text-sm text-emerald-600 dark:text-emerald-400">{ok}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-fg transition-[transform,filter,opacity] duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? "처리 중…" : "가입하기"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        이미 계정이 있으면{" "}
        <Link href="/login" className="font-medium text-accent underline transition-colors duration-200 hover:text-accent-hover">
          로그인
        </Link>
      </p>
    </div>
  );
}

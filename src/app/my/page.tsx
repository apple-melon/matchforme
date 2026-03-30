"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Hosted = {
  id: string;
  code: string;
  title: string;
  createdAt: string;
  participantCount: number;
};

type Participation = {
  participantId: string;
  name: string;
  affiliation: string;
  tournament: {
    id: string;
    code: string;
    title: string;
    format: string;
    hasBracket: boolean;
  };
};

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null);
  const [checking, setChecking] = useState(true);
  const [hosted, setHosted] = useState<Hosted[]>([]);
  const [parts, setParts] = useState<Participation[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      const me = await fetch("/api/auth/me", { credentials: "include" });
      const mj = (await me.json()) as { user: { email: string; name: string | null } | null };
      if (c) return;
      if (!mj.user) {
        setUser(null);
        setChecking(false);
        return;
      }
      setUser(mj.user);
      const [hRes, pRes] = await Promise.all([
        fetch("/api/tournaments/my", { credentials: "include" }),
        fetch("/api/me/participations", { credentials: "include" }),
      ]);
      if (c) return;
      if (!hRes.ok) {
        const j = (await hRes.json()) as { error?: string };
        setErr(j.error ?? "내 대회를 불러오지 못했습니다.");
      } else {
        const j = (await hRes.json()) as { tournaments: Hosted[] };
        setHosted(j.tournaments ?? []);
      }
      if (pRes.ok) {
        const j = (await pRes.json()) as { items: Participation[] };
        setParts(j.items ?? []);
      }
      setChecking(false);
    })();
    return () => {
      c = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">불러오는 중…</div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">내 대회 · 내 참가</h1>
        <p className="mt-2 text-sm text-muted">로그인 후 주최한 대회와 참가한 대회를 볼 수 있습니다.</p>
        <Link
          href="/login?next=/my"
          className="mt-8 inline-block rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-900"
        >
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">내 대회 · 내 참가</h1>
          <p className="text-sm text-muted">{user.name ? `${user.name} · ` : ""}{user.email}</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-card-border px-3 py-1.5 text-sm"
        >
          로그아웃
        </button>
      </div>

      {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">주최한 대회</h2>
        <p className="text-sm text-muted">운영 페이지에서 대진·승패를 기록할 수 있습니다.</p>
        <ul className="mt-4 space-y-3">
          {hosted.length === 0 ? (
            <li className="rounded-xl border border-card-border bg-card p-4 text-sm text-muted">
              아직 만든 대회가 없습니다.{" "}
              <Link href="/create" className="text-amber-600 underline">
                대회 만들기
              </Link>
            </li>
          ) : (
            hosted.map((t) => (
              <li key={t.id} className="rounded-xl border border-card-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{t.title}</p>
                    <p className="text-xs text-muted">
                      코드 <span className="font-mono">{t.code}</span> · 참가 {t.participantCount}명
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/manage/${t.id}`}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-900"
                    >
                      운영
                    </Link>
                    <Link href={`/t/${t.code}`} className="rounded-lg border border-card-border px-3 py-1.5 text-sm">
                      진행 보기
                    </Link>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">참가한 대회</h2>
        <p className="text-sm text-muted">로그인한 상태로 참가 신청한 대회의 진행 상황입니다.</p>
        <ul className="mt-4 space-y-3">
          {parts.length === 0 ? (
            <li className="rounded-xl border border-card-border bg-card p-4 text-sm text-muted">
              참가 내역이 없습니다. 홈에서 6자리 코드로 참가 신청해 보세요.
            </li>
          ) : (
            parts.map((p) => (
              <li key={p.participantId} className="rounded-xl border border-card-border bg-card p-4">
                <p className="font-semibold text-foreground">{p.tournament.title}</p>
                <p className="text-xs text-muted">
                  내 이름: {p.name} ({p.affiliation}) · 코드{" "}
                  <span className="font-mono">{p.tournament.code}</span>
                </p>
                <div className="mt-2">
                  <Link href={`/t/${p.tournament.code}`} className="text-sm text-amber-600 underline">
                    진행 상황 보기
                  </Link>
                  {!p.tournament.hasBracket ? (
                    <span className="ml-2 text-xs text-muted">(대진 미공개)</span>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="mt-12 text-center text-sm">
        <Link href="/create" className="text-amber-600 underline">
          새 대회 만들기
        </Link>
        {" · "}
        <Link href="/" className="text-muted underline">
          홈
        </Link>
      </p>
    </div>
  );
}

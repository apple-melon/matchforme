"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PARTICIPANT_FIELD_OPTIONS,
  type ParticipantFieldKey,
} from "@/lib/participant-fields";

type Created = { id: string; code: string; title: string; adminSecret: string };

function downloadOperatorBundle(c: Created) {
  const origin = window.location.origin;
  const manage = `${origin}/manage/${c.id}?k=${encodeURIComponent(c.adminSecret)}`;
  const join = `${origin}/join/${c.code}`;
  const progress = `${origin}/t/${c.code}`;
  const text = [
    "강인 매치 — 대회 운영 정보 (분실 시 복구 불가)",
    "",
    `대회명: ${c.title}`,
    `참가 코드 (6자리 숫자): ${c.code}`,
    "",
    "[참가 링크 — 선수에게 공유]",
    join,
    "",
    "[진행 상황 — 선수·관람]",
    progress,
    "",
    "[운영 링크 — 주최자만 보관]",
    manage,
    "",
    "주최자는 로그인 후 '프로필'에서도 운영 페이지를 열 수 있습니다.",
    "이 파일과 운영 링크는 타인에게 공유하지 마세요.",
  ].join("\n");

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `강인매치-운영정보-${c.code}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export default function CreateTournamentPage() {
  const router = useRouter();
  const [meChecked, setMeChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [title, setTitle] = useState("");
  const [collected, setCollected] = useState<ParticipantFieldKey[]>([]);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const j = (await res.json()) as { user: { id: string } | null };
      if (c) return;
      setLoggedIn(Boolean(j.user));
      setMeChecked(true);
    })();
    return () => {
      c = true;
    };
  }, []);

  function toggleField(key: ParticipantFieldKey) {
    setCollected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function createTournament() {
    setErr(null);
    setCreating(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          collectedFields: collected,
        }),
      });
      const data = (await res.json()) as {
        id?: string;
        code?: string;
        title?: string;
        adminSecret?: string;
        error?: string;
      };
      if (res.status === 401) {
        setErr(data.error ?? "로그인이 필요합니다.");
        return;
      }
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

  if (!meChecked) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-sm text-muted">확인 중…</div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="ui-motion-enter mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">대회 만들기</h1>
        <p className="mt-2 text-sm text-muted">대회를 만들려면 먼저 로그인해 주세요.</p>
        <Link
          href="/login?next=/create"
          className="mt-8 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[0.99]"
        >
          로그인
        </Link>
        <p className="mt-4 text-sm">
          <Link href="/register" className="font-medium text-accent underline transition-colors duration-200 hover:text-accent-hover">
            회원가입
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col gap-10 px-4 py-16">
      <header className="ui-motion-enter space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">새 대회</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">대회 만들기</h1>
        <p className="text-sm text-muted">6자리 숫자 참가 코드와 운영용 비밀 링크가 발급됩니다.</p>
      </header>

      {created ? (
        <section className="ui-motion-enter ui-motion-delay-1 ui-card-lift rounded-2xl border border-card-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">대회가 만들어졌습니다</h2>
          <p className="mt-1 text-sm text-muted">{created.title}</p>
          <p className="mt-4 text-xs font-medium uppercase text-muted">참가 코드 (선수들에게 공유)</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-foreground">{created.code}</p>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            운영 비밀 링크는 분실 시 복구할 수 없습니다. 아래에서 텍스트 파일로 저장해 두세요. 로그인한 계정은
            &quot;프로필&quot;에서 언제든 운영 페이지로 들어갈 수 있습니다.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => downloadOperatorBundle(created)}
              className="w-full rounded-lg border border-accent/40 bg-accent-soft px-4 py-2.5 text-sm font-semibold text-foreground transition-[background-color,transform] duration-200 hover:bg-accent/20 active:scale-[0.99] dark:border-accent/50"
            >
              운영·참가 링크.txt 다운로드
            </button>
            <button
              type="button"
              onClick={() => router.push(`/manage/${created.id}`)}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-fg transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.99]"
            >
              운영 페이지로 이동
            </button>
          </div>
        </section>
      ) : (
        <section className="ui-motion-enter ui-motion-delay-1 rounded-2xl border border-card-border bg-card p-6 shadow-sm transition-[box-shadow] duration-300 hover:shadow-md">
          <label className="block text-sm font-medium text-foreground">
            대회 이름 (선택)
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026 봄 친선전"
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-foreground outline-none ring-accent/35 transition-[border-color,box-shadow] duration-200 focus:ring-2"
            />
          </label>
          <div className="mt-6">
            <p className="text-sm font-medium text-foreground">참가 시 받을 정보</p>
            <p className="mt-1 text-xs text-muted">
              이름은 항상 받습니다. 아래에서 추가로 받을 항목만 골라 주세요. (만든 뒤에는 바꿀 수 없습니다.)
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {PARTICIPANT_FIELD_OPTIONS.map((f) => (
                <label key={f.key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={collected.includes(f.key)}
                    onChange={() => toggleField(f.key)}
                  />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void createTournament()}
            disabled={creating}
            className="mt-6 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-fg transition-[transform,filter,opacity] duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
          >
            {creating ? "만드는 중…" : "대회 만들기"}
          </button>
          {err ? <p className="ui-fade-quick mt-3 text-center text-sm text-red-600 dark:text-red-400">{err}</p> : null}
        </section>
      )}

      <p className="text-center text-sm">
        <Link href="/" className="text-muted underline transition-colors duration-200 hover:text-foreground">
          홈으로
        </Link>
      </p>
    </div>
  );
}

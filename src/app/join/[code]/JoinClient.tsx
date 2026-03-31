"use client";

import { PARTICIPANT_FIELD_OPTIONS, parseCollectedFieldsJson } from "@/lib/participant-fields";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Info = {
  id: string;
  code: string;
  title: string;
  participantCount: number;
  collectedFieldsJson?: string;
  startedAt?: string | null;
};

function normalizeCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function JoinClient({ code }: { code: string }) {
  const router = useRouter();
  const digits = normalizeCode(code);
  const [info, setInfo] = useState<Info | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [age, setAge] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const wanted = useMemo(
    () => parseCollectedFieldsJson(info?.collectedFieldsJson ?? "[]"),
    [info?.collectedFieldsJson],
  );

  useEffect(() => {
    if (digits.length !== 6) {
      setLoadErr("참가 코드는 6자리 숫자여야 합니다.");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadErr(null);
      const res = await fetch(`/api/tournaments/by-code/${encodeURIComponent(digits)}`);
      const data = (await res.json()) as Info & { error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setLoadErr(data.error ?? "대회를 찾을 수 없습니다.");
        return;
      }
      setInfo(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [digits]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;
    setFormErr(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        affiliation: wanted.includes("affiliation") ? affiliation.trim() : "",
      };
      if (wanted.includes("weightKg")) body.weightKg = Number(weightKg.replace(",", "."));
      if (wanted.includes("heightCm")) body.heightCm = Number(heightCm.replace(",", "."));
      if (wanted.includes("age")) body.age = Number(age);

      const res = await fetch(`/api/tournaments/${info.id}/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFormErr(data.error ?? "신청에 실패했습니다.");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (digits.length !== 6) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-red-600 dark:text-red-400">참가 코드는 6자리 숫자여야 합니다.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-accent underline">
          처음으로
        </Link>
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-red-600 dark:text-red-400">{loadErr}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-accent underline">
          처음으로
        </Link>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">불러오는 중…</div>
    );
  }

  if (info.startedAt) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">참가 신청이 마감되었습니다</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {info.title}는 이미 시작된 대회입니다. 진행 상황은 공개 페이지에서 확인할 수 있습니다.
        </p>
        <Link
          href={`/t/${info.code}`}
          className="mt-8 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg"
        >
          진행 상황 보기
        </Link>
        <p className="mt-6">
          <Link href="/" className="text-sm text-zinc-500 underline">
            홈으로
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">참가 신청 완료</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {info.title} ({info.code})에 등록되었습니다.
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          로그인한 상태로 신청했다면 &quot;내 참가&quot;에서도 진행 상황을 볼 수 있습니다.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={`/t/${info.code}`}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg"
          >
            대회 진행 상황 보기
          </Link>
          <Link href="/profile" className="text-sm text-accent underline">
            프로필
          </Link>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-zinc-500 underline"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-3 py-8 sm:px-4 sm:py-12">
      <p className="text-center text-xs font-medium uppercase tracking-wider text-zinc-500">참가 코드 {info.code}</p>
      <h1 className="mt-2 text-center text-xl font-bold leading-snug text-zinc-900 sm:text-2xl dark:text-zinc-50">
        {info.title}
      </h1>
      <p className="mt-1 text-center text-sm text-zinc-500">현재 {info.participantCount}명 신청</p>

      <form
        onSubmit={(e) => void submit(e)}
        className="mt-10 space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          이름
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
        {wanted.includes("affiliation") ? (
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            소속
            <input
              required
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
        ) : null}
        {wanted.includes("weightKg") ? (
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {PARTICIPANT_FIELD_OPTIONS.find((o) => o.key === "weightKg")?.label}
            <input
              required
              type="number"
              inputMode="decimal"
              min={1}
              max={500}
              step={0.1}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
        ) : null}
        {wanted.includes("heightCm") ? (
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {PARTICIPANT_FIELD_OPTIONS.find((o) => o.key === "heightCm")?.label}
            <input
              required
              type="number"
              inputMode="decimal"
              min={1}
              max={300}
              step={0.1}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
        ) : null}
        {wanted.includes("age") ? (
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {PARTICIPANT_FIELD_OPTIONS.find((o) => o.key === "age")?.label}
            <input
              required
              type="number"
              min={0}
              max={150}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
        ) : null}
        {formErr ? <p className="text-sm text-red-600">{formErr}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="min-h-12 w-full rounded-lg bg-accent py-3 text-base font-semibold text-accent-fg disabled:opacity-60 hover:brightness-110 sm:min-h-0 sm:py-2.5 sm:text-sm"
        >
          {submitting ? "전송 중…" : "참가 신청"}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link href="/" className="text-sm text-zinc-500 underline">
          홈으로
        </Link>
      </p>
    </div>
  );
}

"use client";

import type { BracketData, DrawFormat, SeedBy } from "@/lib/bracket";
import { BracketView } from "@/components/BracketView";
import { PdfExportButton } from "@/components/PdfExportButton";
import { PARTICIPANT_FIELD_OPTIONS, parseCollectedFieldsJson, type ParticipantFieldKey } from "@/lib/participant-fields";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

type Participant = {
  id: string;
  name: string;
  affiliation: string;
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
};

type TournamentPayload = {
  id: string;
  code: string;
  title: string;
  format: string;
  bracketJson: string | null;
  collectedFieldsJson: string;
  splitClassCount: number;
  seedBy: string;
  participants: Participant[];
};

const FORMATS: { value: DrawFormat; label: string; hint: string }[] = [
  { value: "TOURNAMENT", label: "토너먼트", hint: "단판 토너먼트, 부전승 자동 처리" },
  { value: "LEAGUE", label: "리그", hint: "전원이 서로 한 번씩 만나는 리그전" },
  { value: "LEAGUE_PHASED", label: "리그 (예선 + 본선)", hint: "A/B조 예선 리그 후 본선 결승" },
  {
    value: "WEIGHT_CLASS",
    label: "체급별 토너먼트",
    hint: "몸무게 순으로 정렬 후 조를 나누어 조별 토너먼트 (몸무게 필수)",
  },
  {
    value: "HEIGHT_CLASS",
    label: "키급별 토너먼트",
    hint: "키 순으로 정렬 후 조를 나누어 조별 토너먼트 (키 필수)",
  },
];

const STORAGE_PREFIX = "bracket_admin_";
const PRINT_ID = "bracket-print";

function parseBracket(json: string | null): BracketData | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as BracketData;
  } catch {
    return null;
  }
}

function ManageShell() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-zinc-500 dark:text-zinc-400">
      운영 페이지 준비 중…
    </div>
  );
}

function ManageInner({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientReady, setClientReady] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [data, setData] = useState<TournamentPayload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBracket, setShowBracket] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const k = searchParams.get("k");
    if (k) {
      sessionStorage.setItem(`${STORAGE_PREFIX}${tournamentId}`, k);
      setSecret(k);
      router.replace(`/manage/${tournamentId}`, { scroll: false });
    } else {
      setSecret(sessionStorage.getItem(`${STORAGE_PREFIX}${tournamentId}`));
    }
    setClientReady(true);
  }, [searchParams, tournamentId, router]);

  const fetchData = useCallback(async () => {
    if (!secret) return;
    setLoadErr(null);
    const res = await fetch(`/api/tournaments/${tournamentId}`, {
      headers: { "x-admin-secret": secret },
    });
    const json = (await res.json()) as TournamentPayload & { error?: string };
    if (!res.ok) {
      setLoadErr(json.error ?? "불러오지 못했습니다.");
      setData(null);
      return;
    }
    setData(json);
  }, [secret, tournamentId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const bracket = useMemo(() => parseBracket(data?.bracketJson ?? null), [data?.bracketJson]);

  const collected = useMemo(
    () => parseCollectedFieldsJson(data?.collectedFieldsJson ?? "[]"),
    [data?.collectedFieldsJson],
  );

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined" || !data) return "";
    return `${window.location.origin}/join/${data.code}`;
  }, [data]);

  const manageBookmarkUrl = useMemo(() => {
    if (typeof window === "undefined" || !secret) return "";
    return `${window.location.origin}/manage/${tournamentId}?k=${encodeURIComponent(secret)}`;
  }, [secret, tournamentId]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  async function patchSettings(partial: {
    collectedFields?: ParticipantFieldKey[];
    splitClassCount?: number;
    seedBy?: SeedBy;
  }) {
    if (!secret) return;
    setBusy("settings");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(partial),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        alert(j.error ?? "저장 실패");
        return;
      }
      await fetchData();
    } finally {
      setBusy(null);
    }
  }

  async function patchFormat(f: DrawFormat) {
    if (!secret) return;
    setBusy("format");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/format`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ format: f }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        alert(j.error ?? "저장 실패");
        return;
      }
      await fetchData();
    } finally {
      setBusy(null);
    }
  }

  async function runDraw() {
    if (!secret) return;
    setBusy("draw");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/draw`, {
        method: "POST",
        headers: { "x-admin-secret": secret },
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(j.error ?? "대진 추첨 실패");
        return;
      }
      await fetchData();
      setShowBracket(true);
    } finally {
      setBusy(null);
    }
  }

  async function deleteParticipants(all: boolean) {
    if (!secret || !data) return;
    if (all) {
      if (!confirm("모든 참가자를 삭제할까요? 대진표도 초기화됩니다.")) return;
    } else {
      if (selected.size === 0) {
        alert("삭제할 사람을 선택해 주세요.");
        return;
      }
      if (!confirm(`선택한 ${selected.size}명을 삭제할까요?`)) return;
    }
    setBusy("del");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(all ? { all: true } : { ids: Array.from(selected) }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        alert(j.error ?? "삭제 실패");
        return;
      }
      setSelected(new Set());
      await fetchData();
    } finally {
      setBusy(null);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleField(key: ParticipantFieldKey) {
    const next = collected.includes(key) ? collected.filter((k) => k !== key) : [...collected, key];
    void patchSettings({ collectedFields: next });
  }

  if (!clientReady) {
    return <ManageShell />;
  }

  if (!secret) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">운영 권한이 필요합니다</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          대회를 만들 때 받은 운영 링크(?k= 포함)로 다시 들어오거나, 같은 브라우저에서 대회를 생성한 경우 자동으로
          인식됩니다.
        </p>
        <Link href="/" className="mt-8 inline-block text-amber-600 underline">
          홈으로
        </Link>
      </div>
    );
  }

  if (loadErr || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-sm text-red-600">{loadErr ?? "불러오는 중…"}</p>
        <Link href="/" className="mt-6 inline-block text-sm underline">
          홈으로
        </Link>
      </div>
    );
  }

  const currentFormat = data.format as DrawFormat;
  const seedBy = (data.seedBy === "weightKg" || data.seedBy === "heightCm" ? data.seedBy : "random") as SeedBy;
  const minPlayers =
    currentFormat === "WEIGHT_CLASS" || currentFormat === "HEIGHT_CLASS" ? 1 : 2;
  const canDraw = data.participants.length >= minPlayers;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">대회 운영</p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{data.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-zinc-100 px-3 py-1 font-mono text-lg font-bold tracking-widest dark:bg-zinc-800">
              {data.code}
            </span>
            <button
              type="button"
              onClick={() => void copyText(data.code)}
              className="text-sm text-amber-600 underline"
            >
              코드 복사
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-right text-sm">
          <span className="text-zinc-500">참가 링크</span>
          <button
            type="button"
            onClick={() => void copyText(joinUrl)}
            className="max-w-xs truncate text-left text-amber-600 underline sm:max-w-md sm:text-right"
            title={joinUrl}
          >
            {joinUrl || "…"}
          </button>
          <span className="text-zinc-500">운영 링크 (분실 금지)</span>
          <button
            type="button"
            onClick={() => void copyText(manageBookmarkUrl)}
            className="max-w-xs truncate text-left text-amber-600 underline sm:max-w-md sm:text-right"
            title={manageBookmarkUrl}
          >
            북마크용 복사
          </button>
        </div>
      </div>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">참가자에게 받을 정보</h2>
        <p className="mt-1 text-sm text-zinc-500">
          체크한 항목은 참가 신청 폼에 표시되며, 대진 시드·체급/키급 나누기에 사용할 수 있습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          {PARTICIPANT_FIELD_OPTIONS.map((f) => (
            <label key={f.key} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={collected.includes(f.key)}
                onChange={() => toggleField(f.key)}
                disabled={Boolean(busy)}
              />
              <span>{f.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">참가자 ({data.participants.length}명)</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void deleteParticipants(false)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
            >
              선택 삭제
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void deleteParticipants(true)}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 dark:border-red-800 dark:text-red-400"
            >
              전체 삭제
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="w-10 px-3 py-2" />
                <th className="px-3 py-2">소속</th>
                <th className="px-3 py-2">이름</th>
                {collected.includes("weightKg") ? <th className="px-3 py-2">몸무게</th> : null}
                {collected.includes("heightCm") ? <th className="px-3 py-2">키</th> : null}
                {collected.includes("age") ? <th className="px-3 py-2">나이</th> : null}
              </tr>
            </thead>
            <tbody>
              {data.participants.map((p) => (
                <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      aria-label={`${p.name} 선택`}
                    />
                  </td>
                  <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{p.affiliation}</td>
                  <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{p.name}</td>
                  {collected.includes("weightKg") ? (
                    <td className="px-3 py-2 text-zinc-600">{p.weightKg != null ? `${p.weightKg}` : "—"}</td>
                  ) : null}
                  {collected.includes("heightCm") ? (
                    <td className="px-3 py-2 text-zinc-600">{p.heightCm != null ? `${p.heightCm}` : "—"}</td>
                  ) : null}
                  {collected.includes("age") ? (
                    <td className="px-3 py-2 text-zinc-600">{p.age != null ? `${p.age}` : "—"}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {data.participants.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">아직 참가 신청이 없습니다.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">대진 옵션</h2>
        <p className="mt-1 text-sm text-zinc-500">시드 방식과 체급·키급 조 개수를 정합니다.</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">시드 (배열 순서)</span>
            <select
              value={seedBy}
              disabled={Boolean(busy)}
              onChange={(e) => void patchSettings({ seedBy: e.target.value as SeedBy })}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            >
              <option value="random">랜덤</option>
              <option value="weightKg" disabled={!collected.includes("weightKg")}>
                몸무게 가벼운 순
              </option>
              <option value="heightCm" disabled={!collected.includes("heightCm")}>
                키 작은 순
              </option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">체급/키급 나누기 — 조 개수</span>
            <select
              value={data.splitClassCount}
              disabled={Boolean(busy)}
              onChange={(e) => void patchSettings({ splitClassCount: Number(e.target.value) })}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}조
                </option>
              ))}
            </select>
            <span className="text-xs text-zinc-500">체급별·키급별 토너먼트에서만 사용됩니다.</span>
          </label>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">경기 운영 방식</h2>
        <p className="mt-1 text-sm text-zinc-500">방식을 고른 뒤 대진 생성으로 매칭합니다.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FORMATS.map((f) => (
            <label
              key={f.value}
              className={`cursor-pointer rounded-xl border p-4 transition ${
                currentFormat === f.value
                  ? "border-amber-500 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/30"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  name="format"
                  checked={currentFormat === f.value}
                  onChange={() => void patchFormat(f.value)}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{f.label}</span>
                  <p className="mt-1 text-xs text-zinc-500">{f.hint}</p>
                </span>
              </div>
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={Boolean(busy) || !canDraw}
          onClick={() => void runDraw()}
          className="mt-6 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
        >
          {busy === "draw" ? "대진 생성 중…" : "대진 생성 (매칭)"}
        </button>
        {!canDraw ? (
          <p className="mt-2 text-xs text-zinc-500">
            {currentFormat === "WEIGHT_CLASS" || currentFormat === "HEIGHT_CLASS"
              ? "참가자가 1명 이상이면 생성할 수 있습니다."
              : "참가자가 2명 이상이면 생성할 수 있습니다."}
          </p>
        ) : null}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowBracket((v) => !v)}
            disabled={!bracket}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-600"
          >
            {showBracket ? "대진표 접기" : "대진표 보기"}
          </button>
          {showBracket && bracket ? (
            <PdfExportButton fileName={`${data.title}-대진표`} targetId={PRINT_ID} />
          ) : null}
        </div>

        {showBracket && bracket ? (
          <div
            id={PRINT_ID}
            className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm print:border-0"
          >
            <p className="text-xs text-zinc-500">{data.title}</p>
            <h2 className="text-xl font-bold">대진표</h2>
            <div className="mt-6">
              <BracketView data={bracket} />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            먼저 대진 생성으로 매칭한 뒤 &quot;대진표 보기&quot;를 누르세요.
          </p>
        )}
      </section>

      <p className="mt-12 text-center text-sm">
        <Link href="/" className="text-zinc-500 underline">
          홈으로
        </Link>
      </p>
    </div>
  );
}

export function ManageClient({ tournamentId }: { tournamentId: string }) {
  return (
    <Suspense fallback={<ManageShell />}>
      <ManageInner tournamentId={tournamentId} />
    </Suspense>
  );
}

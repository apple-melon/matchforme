"use client";

import type { BracketData, DrawFormat, SeedBy } from "@/lib/bracket";
import { BracketView } from "@/components/BracketView";
import { AnimatedSelect } from "@/components/AnimatedSelect";
import { JoinQrDownloadButton } from "@/components/JoinQrDownloadButton";
import { PdfExportButton } from "@/components/PdfExportButton";
import { parseCollectedFieldsJson } from "@/lib/participant-fields";
import type { MatchResults } from "@/lib/match-results";
import {
  computeByeAutoResults,
  parseMatchResultsJson,
  resolveBracketDisplayData,
} from "@/lib/match-results";
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
  matchResultsJson: string | null;
  collectedFieldsJson: string;
  startedAt: string | null;
  endedAt: string | null;
  splitClassCount: number;
  seedBy: string;
  isOwner?: boolean;
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

function manageHeaders(secret: string | null): HeadersInit {
  const h: Record<string, string> = {};
  if (secret) h["x-admin-secret"] = secret;
  return h;
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
  const [loading, setLoading] = useState(true);
  const [matchResults, setMatchResults] = useState<MatchResults>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBracket, setShowBracket] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

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
    setLoading(true);
    setLoadErr(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        credentials: "include",
        headers: manageHeaders(secret),
      });
      const json = (await res.json()) as TournamentPayload & { error?: string };
      if (!res.ok) {
        setLoadErr(json.error ?? "불러오지 못했습니다.");
        setData(null);
        return;
      }
      setData(json);
      const b = parseBracket(json.bracketJson);
      const raw = parseMatchResultsJson(json.matchResultsJson);
      setMatchResults(b ? { ...computeByeAutoResults(b), ...raw } : raw);
    } finally {
      setLoading(false);
    }
  }, [secret, tournamentId]);

  useEffect(() => {
    if (!clientReady) return;
    void fetchData();
  }, [clientReady, fetchData]);

  useEffect(() => {
    if (!data?.startedAt || data?.endedAt) return;
    const tmr = setInterval(() => void fetchData(), 2500);
    return () => clearInterval(tmr);
  }, [data?.startedAt, data?.endedAt, fetchData]);

  useEffect(() => {
    if (data?.startedAt && data?.bracketJson) setShowBracket(true);
  }, [data?.startedAt, data?.bracketJson]);

  const bracket = useMemo(() => parseBracket(data?.bracketJson ?? null), [data?.bracketJson]);
  const displayBracket = useMemo(() => {
    if (!bracket) return null;
    return resolveBracketDisplayData(bracket, matchResults);
  }, [bracket, matchResults]);

  const collected = useMemo(
    () => parseCollectedFieldsJson(data?.collectedFieldsJson ?? "[]"),
    [data?.collectedFieldsJson],
  );

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined" || !data) return "";
    return `${window.location.origin}/join/${data.code}`;
  }, [data]);

  const publicProgressUrl = useMemo(() => {
    if (typeof window === "undefined" || !data) return "";
    return `${window.location.origin}/t/${data.code}`;
  }, [data]);

  const manageBookmarkUrl = useMemo(() => {
    if (typeof window === "undefined" || !secret) return "";
    return `${window.location.origin}/manage/${tournamentId}?k=${encodeURIComponent(secret)}`;
  }, [secret, tournamentId]);

  const canManage = Boolean(data);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function copyWithNotice(text: string, okMessage: string) {
    const ok = await copyText(text);
    if (ok) {
      setCopyFeedback(okMessage);
      window.setTimeout(() => setCopyFeedback(null), 2800);
    } else {
      setCopyFeedback("복사에 실패했습니다. 브라우저에서 클립보드 권한을 확인해 주세요.");
      window.setTimeout(() => setCopyFeedback(null), 3500);
    }
  }

  function showMessage(msg: string) {
    setCopyFeedback(msg);
    window.setTimeout(() => setCopyFeedback(null), msg.includes("못했") ? 3500 : 2800);
  }

  async function patchMatch(matchKey: string, winner: "left" | "right" | null) {
    if (!canManage) return;
    setBusy("match");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...manageHeaders(secret) },
        body: JSON.stringify({ matchKey, winner }),
      });
      const j = (await res.json()) as { error?: string; matchResults?: MatchResults };
      if (!res.ok) {
        alert(j.error ?? "저장 실패");
        return;
      }
      if (j.matchResults) setMatchResults(j.matchResults);
      await fetchData();
    } finally {
      setBusy(null);
    }
  }

  async function deleteTournament() {
    if (!data?.isOwner) return;
    if (!confirm("이 대회와 모든 참가·대진 데이터가 삭제됩니다. 계속할까요?")) return;
    setBusy("delT");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "DELETE",
        credentials: "include",
        headers: manageHeaders(secret),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(j.error ?? "삭제 실패");
        return;
      }
      router.push("/profile");
    } finally {
      setBusy(null);
    }
  }

  async function finishTournament() {
    if (!canManage || !data?.startedAt || data?.endedAt) return;
    if (
      !confirm(
        "대회를 종료하면 경기 결과를 더 이상 수정할 수 없습니다. 참가자 화면에도 종료로 표시됩니다. 진행할까요?",
      )
    )
      return;
    setBusy("finish");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/finish`, {
        method: "POST",
        credentials: "include",
        headers: manageHeaders(secret),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(j.error ?? "종료 처리 실패");
        return;
      }
      await fetchData();
    } finally {
      setBusy(null);
    }
  }

  async function startTournament() {
    if (!canManage || !data?.bracketJson) return;
    if (!confirm("대회를 시작하면 대진·방식을 바꿀 수 없고, 이후부터 경기 결과만 기록할 수 있습니다. 진행할까요?")) return;
    setBusy("start");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/start`, {
        method: "POST",
        credentials: "include",
        headers: manageHeaders(secret),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(j.error ?? "시작 처리 실패");
        return;
      }
      await fetchData();
      setShowBracket(true);
    } finally {
      setBusy(null);
    }
  }

  async function patchSettings(partial: { splitClassCount?: number; seedBy?: SeedBy }) {
    if (!canManage) return;
    setBusy("settings");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...manageHeaders(secret) },
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
    if (!canManage) return;
    setBusy("format");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/format`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...manageHeaders(secret) },
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
    if (!canManage) return;
    setBusy("draw");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/draw`, {
        method: "POST",
        credentials: "include",
        headers: manageHeaders(secret),
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
    if (!canManage || !data) return;
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
        credentials: "include",
        headers: { "Content-Type": "application/json", ...manageHeaders(secret) },
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

  if (!clientReady) {
    return <ManageShell />;
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">불러오는 중…</div>
    );
  }

  if (loadErr || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{loadErr ?? "오류"}</p>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          운영 비밀 링크(?k= 포함)로 들어오거나, 이 대회를 만든 계정으로{" "}
          <Link href="/login" className="text-accent underline">
            로그인
          </Link>
          한 뒤 &quot;내 대회&quot;에서 다시 열어 주세요.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm underline">
          홈으로
        </Link>
      </div>
    );
  }

  const currentFormat = data.format as DrawFormat;
  const seedBy = (data.seedBy === "weightKg" || data.seedBy === "heightCm" ? data.seedBy : "random") as SeedBy;
  const minPlayers = currentFormat === "WEIGHT_CLASS" || currentFormat === "HEIGHT_CLASS" ? 1 : 2;
  const canDraw = data.participants.length >= minPlayers;

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4 sm:py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-zinc-500">대회 운영</p>
          <h1 className="text-xl font-bold leading-snug text-zinc-900 sm:text-2xl dark:text-zinc-50">{data.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-zinc-100 px-3 py-2 font-mono text-base font-bold tracking-widest sm:text-lg dark:bg-zinc-800">
              {data.code}
            </span>
            <button
              type="button"
              onClick={() => void copyWithNotice(data.code, "참가 코드가 복사되었습니다.")}
              className="min-h-10 rounded-lg px-2 text-sm text-accent underline sm:min-h-0"
            >
              코드 복사
            </button>
          </div>
          {data.isOwner ? (
            <p className="mt-2 text-xs text-zinc-500">주최자 계정으로 접속 중입니다.</p>
          ) : null}
          {data.endedAt ? (
            <p className="mt-2 rounded-lg bg-zinc-200/90 px-3 py-1.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700/80 dark:text-zinc-100">
              대회 종료됨 · 경기 결과 수정 불가
            </p>
          ) : data.startedAt ? (
            <p className="mt-2 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
              대회 진행 중 · 결과는 참가자 화면에도 주기적으로 반영됩니다.
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:max-w-xs sm:border-0 sm:bg-transparent sm:p-0 sm:text-right">
          <span className="text-left text-sm font-medium text-zinc-700 sm:text-right dark:text-zinc-300">
            참가·진행 보기
          </span>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void copyWithNotice(joinUrl, "참가 링크가 복사되었습니다.")}
              className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-accent underline decoration-accent/60 underline-offset-2 dark:border-zinc-700 dark:bg-zinc-950 sm:min-h-0 sm:border-0 sm:bg-transparent sm:py-1 sm:text-right"
              title={joinUrl}
            >
              참가 링크 복사
            </button>
            <JoinQrDownloadButton
              url={joinUrl}
              fileBaseName={`${data.title}-${data.code}`}
              onNotice={showMessage}
            />
          </div>
          <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700 sm:border-0 sm:pt-0">
            <Link
              href={`${publicProgressUrl || "#"}#t-schedule`}
              className="min-h-11 inline-flex items-center rounded-lg px-1 py-2 text-accent underline decoration-accent/60 underline-offset-2 sm:min-h-0 sm:justify-end sm:py-0"
            >
              공개 페이지 — 경기 순서
            </Link>
            <Link
              href={`${publicProgressUrl || "#"}#t-bracket`}
              className="min-h-11 inline-flex items-center rounded-lg px-1 py-2 text-accent underline decoration-accent/60 underline-offset-2 sm:min-h-0 sm:justify-end sm:py-0"
            >
              공개 페이지 — 대진표·기록
            </Link>
          </div>
          {secret ? (
            <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700 sm:border-0 sm:pt-0">
              <span className="text-left text-xs text-zinc-500 sm:text-right">운영 링크 (분실 금지)</span>
              <button
                type="button"
                onClick={() => void copyWithNotice(manageBookmarkUrl, "운영(북마크) 링크가 복사되었습니다.")}
                className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm text-accent underline dark:border-zinc-700 dark:bg-zinc-950 sm:min-h-0 sm:border-0 sm:bg-transparent sm:py-1 sm:text-right"
                title={manageBookmarkUrl}
              >
                북마크용 복사
              </button>
            </div>
          ) : (
            <span className="text-left text-xs text-zinc-500 sm:text-right">
              비밀 운영 링크는 최초 생성 시 저장한 경우에만 복사할 수 있습니다.
            </span>
          )}
          {data.isOwner ? (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void deleteTournament()}
              className="mt-1 min-h-11 w-full rounded-lg border border-red-300 px-3 py-2.5 text-sm text-red-700 sm:mt-2 sm:ml-auto sm:min-h-0 sm:w-auto sm:py-1.5 dark:border-red-800 dark:text-red-400"
            >
              대회 삭제 (주최자만)
            </button>
          ) : null}
        </div>
      </div>

      {copyFeedback ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 max-w-[min(90vw,24rem)] -translate-x-1/2 rounded-xl border border-emerald-500/40 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-900 shadow-lg dark:border-emerald-600/50 dark:bg-emerald-950/90 dark:text-emerald-100"
        >
          {copyFeedback}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">참가자 ({data.participants.length}명)</h2>
            {data.startedAt ? (
              <p className="mt-1 text-xs text-zinc-500">대회 시작 후에는 참가자 삭제가 비활성화됩니다.</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy) || Boolean(data.startedAt)}
              onClick={() => void deleteParticipants(false)}
              className="min-h-10 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:min-h-0 sm:flex-none dark:border-zinc-600"
            >
              선택 삭제
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || Boolean(data.startedAt)}
              onClick={() => void deleteParticipants(true)}
              className="min-h-10 flex-1 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 sm:min-h-0 sm:flex-none dark:border-red-800 dark:text-red-400"
            >
              전체 삭제
            </button>
          </div>
        </div>
        {data.participants.length === 0 ? (
          <p className="mt-4 p-6 text-center text-sm text-zinc-500">아직 참가 신청이 없습니다.</p>
        ) : (
          <>
            <div className="mt-4 space-y-3 sm:hidden">
              {data.participants.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</p>
                      {collected.includes("affiliation") ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{p.affiliation || "—"}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                        {collected.includes("weightKg") ? (
                          <span>몸무게 {p.weightKg != null ? `${p.weightKg}kg` : "—"}</span>
                        ) : null}
                        {collected.includes("heightCm") ? (
                          <span>키 {p.heightCm != null ? `${p.heightCm}cm` : "—"}</span>
                        ) : null}
                        {collected.includes("age") ? <span>나이 {p.age != null ? `${p.age}` : "—"}</span> : null}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      disabled={Boolean(data.startedAt)}
                      aria-label={`${p.name} 선택`}
                      className="mt-1 h-5 w-5 shrink-0 touch-manipulation"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 hidden overflow-x-auto rounded-xl border border-zinc-100 sm:block dark:border-zinc-800">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                  <tr>
                    <th className="w-10 px-3 py-2" />
                    {collected.includes("affiliation") ? <th className="px-3 py-2">소속</th> : null}
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
                          disabled={Boolean(data.startedAt)}
                          aria-label={`${p.name} 선택`}
                        />
                      </td>
                      {collected.includes("affiliation") ? (
                        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{p.affiliation || "—"}</td>
                      ) : null}
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
            </div>
          </>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">대진 옵션</h2>
        <p className="mt-1 text-sm text-zinc-500">대진 추첨 시 참가자 배열 순서(시드)를 정합니다.</p>
        <div className="mt-4">
          <label className="flex max-w-md flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">시드 (배열 순서)</span>
            <AnimatedSelect
              aria-label="시드 방식"
              value={seedBy}
              disabled={Boolean(busy) || Boolean(data.startedAt)}
              onChange={(v) => void patchSettings({ seedBy: v as SeedBy })}
              className="max-w-md"
              options={[
                { value: "random", label: "랜덤" },
                {
                  value: "weightKg",
                  label: "몸무게 가벼운 순",
                  disabled: !collected.includes("weightKg"),
                },
                {
                  value: "heightCm",
                  label: "키 작은 순",
                  disabled: !collected.includes("heightCm"),
                },
              ]}
            />
          </label>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">경기 운영 방식</h2>
        <p className="mt-1 text-sm text-zinc-500">방식을 고른 뒤 대진 생성으로 매칭합니다.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FORMATS.map((f) => (
            <label
              key={f.value}
              className={`cursor-pointer rounded-xl border p-4 transition ${
                currentFormat === f.value
                  ? "border-accent bg-accent-soft dark:border-accent dark:bg-accent/10"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  name="format"
                  checked={currentFormat === f.value}
                  onChange={() => void patchFormat(f.value)}
                  disabled={Boolean(data.startedAt)}
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

        {currentFormat === "WEIGHT_CLASS" || currentFormat === "HEIGHT_CLASS" ? (
          <div className="mt-5 rounded-xl border border-accent/35 bg-accent-soft p-4 dark:border-accent/40 dark:bg-accent/10">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                체급/키급 나누기 — 조 개수
              </span>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                선택한 방식(체급별 토너먼트 / 키급별 토너먼트)에서 몇 개 조로 나눌지 정합니다.
              </p>
              <AnimatedSelect
                aria-label="조 개수"
                className="mt-1 max-w-xs"
                value={String(data.splitClassCount)}
                disabled={Boolean(busy) || Boolean(data.startedAt)}
                onChange={(v) => void patchSettings({ splitClassCount: Number(v) })}
                options={[2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}조` }))}
              />
            </label>
          </div>
        ) : null}

        <button
          type="button"
          disabled={Boolean(busy) || !canDraw || Boolean(data.startedAt)}
          onClick={() => void runDraw()}
          className="mt-6 min-h-11 w-full rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-50 hover:brightness-110 sm:min-h-0 sm:w-auto"
        >
          {busy === "draw" ? "대진 생성 중…" : "대진 생성 (매칭)"}
        </button>
        {data.startedAt ? (
          <p className="mt-2 text-xs text-accent dark:text-accent-hover">대회가 시작되어 대진을 다시 뽑을 수 없습니다.</p>
        ) : null}
        {!canDraw ? (
          <p className="mt-2 text-xs text-zinc-500">
            {currentFormat === "WEIGHT_CLASS" || currentFormat === "HEIGHT_CLASS"
              ? "참가자가 1명 이상이면 생성할 수 있습니다."
              : "참가자가 2명 이상이면 생성할 수 있습니다."}
          </p>
        ) : null}
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={() => setShowBracket((v) => !v)}
            disabled={!bracket}
            className="min-h-11 w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium disabled:opacity-40 sm:min-h-0 sm:w-auto dark:border-zinc-600"
          >
            {showBracket ? "대진표 접기" : "대진표 보기"}
          </button>
          {showBracket && bracket ? (
            <PdfExportButton fileName={`${data.title}-대진표`} targetId={PRINT_ID} />
          ) : null}
          {bracket && !data.startedAt ? (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void startTournament()}
              className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 sm:min-h-0 sm:w-auto"
            >
              {busy === "start" ? "처리 중…" : "대회 시작"}
            </button>
          ) : null}
          {bracket && data.startedAt && !data.endedAt ? (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void finishTournament()}
              className="min-h-11 w-full rounded-lg border border-zinc-400 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 sm:min-h-0 sm:w-auto dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {busy === "finish" ? "처리 중…" : "대회 종료"}
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          대진이 마음에 들면 <strong className="text-zinc-700 dark:text-zinc-300">대회 시작</strong>을 누른 뒤, 아래
          &quot;결과 반영&quot;에서 승자를 기록하세요. 시작 전에는 미리보기만 가능합니다.
        </p>

        {showBracket && bracket && !data.startedAt ? (
          <div
            id={PRINT_ID}
            className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm print:border-0 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <p className="text-xs text-zinc-500">{data.title}</p>
            <h2 className="text-xl font-bold">대진표 (미리보기)</h2>
            <p className="mt-1 text-sm text-zinc-500">대회 시작 후에만 승패를 기록할 수 있습니다.</p>
            <div className="mt-6">
              <BracketView data={displayBracket ?? bracket} results={matchResults} editable={false} />
            </div>
          </div>
        ) : null}

        {showBracket && bracket && data.startedAt ? (
          <div
            id={PRINT_ID}
            className="mt-6 rounded-2xl border-2 border-emerald-500/40 bg-white p-6 text-zinc-900 shadow-sm print:border-0 dark:border-emerald-600/40 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <p className="text-xs text-zinc-500">{data.title}</p>
            <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-200">결과 반영 · 경기 기록</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              대진표에서 이긴 쪽을 누르면 참가자가 보는 페이지(/t/코드)에도 곧바로 반영됩니다.
            </p>
            <div className="mt-6">
              <BracketView
                data={displayBracket ?? bracket}
                results={matchResults}
                editable={!data.endedAt}
                onSetWinner={(key, w) => void patchMatch(key, w)}
              />
            </div>
          </div>
        ) : null}

        {!bracket ? (
          <p className="mt-4 text-sm text-zinc-500">먼저 대진 생성으로 매칭한 뒤 대진표를 확인하세요.</p>
        ) : null}
      </section>

      <section className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        {data.isOwner ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void deleteTournament()}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              대회 삭제
            </button>
            <p className="text-center text-xs text-zinc-500">
              주최자 계정으로 로그인한 경우에만 삭제됩니다. 상단 오른쪽에도 동일한 버튼이 있습니다.
            </p>
          </div>
        ) : (
          <p className="text-center text-xs text-zinc-500">
            대회 삭제는 이 대회를 만든 계정으로 로그인한 뒤, &quot;내 대회&quot; 또는 운영 페이지에서 주최자 권한으로 진행할 수 있습니다.
          </p>
        )}
      </section>

      <p className="mt-8 text-center text-sm">
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

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
import { DashboardShell } from "@/components/DashboardShell";
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
  { value: "TOURNAMENT", label: "단판 토너먼트", hint: "단판 토너먼트, 부전승 자동 처리" },
  { value: "LEAGUE", label: "리그전", hint: "전원이 서로 한 번씩 만나는 리그전" },
  { value: "LEAGUE_PHASED", label: "리그 (예선 + 본선)", hint: "A/B조 예선 리그 후 본선 결승" },
  { value: "WEIGHT_CLASS", label: "체급별 토너먼트", hint: "몸무게 순으로 정렬 후 조를 나누어 토너먼트 (몸무게 필수)" },
  { value: "HEIGHT_CLASS", label: "키급별 토너먼트", hint: "키 순으로 정렬 후 조를 나누어 토너먼트 (키 필수)" },
];

const STORAGE_PREFIX = "bracket_admin_";
const PRINT_ID = "bracket-print";

type Tab = "info" | "participants" | "match" | "records";

function parseBracket(json: string | null): BracketData | null {
  if (!json) return null;
  try { return JSON.parse(json) as BracketData; } catch { return null; }
}

function manageHeaders(secret: string | null): HeadersInit {
  const h: Record<string, string> = {};
  if (secret) h["x-admin-secret"] = secret;
  return h;
}

function StatusBadge({ startedAt, endedAt }: { startedAt: string | null; endedAt: string | null }) {
  if (endedAt) return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">종료</span>
  );
  if (startedAt) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />진행 중
    </span>
  );
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">대기 중</span>
  );
}

function ManageShell() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-zinc-400">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        <span>운영 페이지 준비 중…</span>
      </div>
    </div>
  );
}

function InfoTab({ data, joinUrl, publicProgressUrl, manageBookmarkUrl, secret, busy, onDelete, onCopy, copyFeedback }: {
  data: TournamentPayload;
  joinUrl: string;
  publicProgressUrl: string;
  manageBookmarkUrl: string;
  secret: string | null;
  busy: string | null;
  onDelete: () => void;
  onCopy: (text: string, msg: string) => void;
  copyFeedback: string | null;
}) {
  const formatLabel = FORMATS.find((f) => f.value === data.format)?.label ?? data.format;
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">토너먼트 정보</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">토너먼트 이름</dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-100">{data.title || "무제 대회"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">토너먼트 형식</dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-100">{formatLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">참가팀</dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-100">{data.participants.length}팀</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">참가 코드</dt>
              <dd className="font-mono font-bold text-zinc-800 dark:text-zinc-100">{data.code}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">링크 관리</p>
          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              onClick={() => onCopy(joinUrl, "참가 링크가 복사되었습니다.")}
              className="flex w-full items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left text-xs hover:border-red-300 hover:bg-red-50 dark:border-zinc-700 dark:bg-zinc-800 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-red-500 shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span className="truncate text-zinc-600 dark:text-zinc-300">참가 링크 복사</span>
            </button>
            <JoinQrDownloadButton url={joinUrl} fileBaseName={`${data.title}-${data.code}`} onNotice={(m) => onCopy("", m)} />
            <Link
              href={`${publicProgressUrl || "#"}`}
              className="flex w-full items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs hover:border-red-300 hover:bg-red-50 dark:border-zinc-700 dark:bg-zinc-800 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-zinc-400 shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
              </svg>
              <span className="truncate text-zinc-600 dark:text-zinc-300">공개 진행 페이지 열기</span>
            </Link>
            {secret && (
              <button
                type="button"
                onClick={() => onCopy(manageBookmarkUrl, "운영 링크가 복사되었습니다.")}
                className="flex w-full items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2.5 text-left text-xs hover:border-amber-400 dark:border-amber-800 dark:bg-amber-950/20 transition"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-amber-500 shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <span className="truncate text-amber-700 dark:text-amber-300">운영 링크 복사 (분실 금지)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      {data.isOwner && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">위험 영역</p>
          <p className="mt-1 text-xs text-red-600/70 dark:text-red-400/70">대회와 모든 데이터가 영구 삭제됩니다.</p>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={onDelete}
            className="mt-3 rounded-xl border border-red-400 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/40 transition"
          >
            대회 삭제 (주최자만)
          </button>
        </div>
      )}
    </div>
  );
}

function ParticipantsTab({ data, busy, onDeleteSelected, onDeleteAll }: {
  data: TournamentPayload;
  busy: string | null;
  onDeleteSelected: (ids: string[]) => void;
  onDeleteAll: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const collected = useMemo(() => parseCollectedFieldsJson(data.collectedFieldsJson ?? "[]"), [data.collectedFieldsJson]);

  const filtered = useMemo(() => {
    if (!search.trim()) return data.participants;
    const q = search.toLowerCase();
    return data.participants.filter(
      (p) => p.name.toLowerCase().includes(q) || p.affiliation?.toLowerCase().includes(q)
    );
  }, [data.participants, search]);

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const total = data.participants.length;
  const confirmed = total;
  const pending = 0;
  const cancelled = 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "전체 참가팀", value: total, color: "text-zinc-700 dark:text-zinc-200", icon: "👥", bg: "bg-zinc-50 dark:bg-zinc-900" },
          { label: "참가 확정", value: confirmed, color: "text-emerald-700 dark:text-emerald-400", icon: "✅", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "대기 중", value: pending, color: "text-amber-600 dark:text-amber-400", icon: "⏳", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "취소", value: cancelled, color: "text-red-600 dark:text-red-400", icon: "❌", bg: "bg-red-50 dark:bg-red-950/30" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800 ${s.bg}`}>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}<span className="text-sm font-medium">팀</span></p>
          </div>
        ))}
      </div>

      {/* Search + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <svg viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="팀 이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-4 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 transition"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          {selected.size > 0 && (
            <button
              type="button"
              disabled={Boolean(busy) || Boolean(data.startedAt)}
              onClick={() => onDeleteSelected(Array.from(selected))}
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 transition"
            >
              선택 삭제 ({selected.size})
            </button>
          )}
          <button
            type="button"
            disabled={Boolean(busy) || Boolean(data.startedAt)}
            onClick={onDeleteAll}
            className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 transition"
          >
            전체 삭제
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {data.participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-zinc-400">
            <svg viewBox="0 0 24 24" fill="none" className="mb-3 h-10 w-10 text-zinc-300" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            </svg>
            아직 참가 신청이 없습니다.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-100 dark:border-zinc-800">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleAll}
                        disabled={Boolean(data.startedAt)}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">순번</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">팀 이름</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">상태</th>
                    {collected.includes("affiliation") && (
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">대표자</th>
                    )}
                    {collected.includes("weightKg") && (
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">몸무게</th>
                    )}
                    {collected.includes("heightCm") && (
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">키</th>
                    )}
                    {collected.includes("age") && (
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">나이</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">등록일</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => (
                    <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50/60 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30 transition">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggle(p.id)}
                          disabled={Boolean(data.startedAt)}
                          aria-label={`${p.name} 선택`}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-100">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">참가 확정</span>
                      </td>
                      {collected.includes("affiliation") && (
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.affiliation || "—"}</td>
                      )}
                      {collected.includes("weightKg") && (
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.weightKg != null ? `${p.weightKg}kg` : "—"}</td>
                      )}
                      {collected.includes("heightCm") && (
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.heightCm != null ? `${p.heightCm}cm` : "—"}</td>
                      )}
                      {collected.includes("age") && (
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.age != null ? `${p.age}세` : "—"}</td>
                      )}
                      <td className="px-4 py-3 text-xs text-zinc-400">등록됨</td>
                      <td className="px-4 py-3">
                        <button type="button" className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    disabled={Boolean(data.startedAt)}
                    className="rounded h-4 w-4"
                  />
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-800">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100 truncate">{p.name}</p>
                    {collected.includes("affiliation") && p.affiliation && (
                      <p className="text-xs text-zinc-500">{p.affiliation}</p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">참가 확정</span>
                </div>
              ))}
            </div>

            {/* Pagination indicator */}
            {filtered.length > 0 && (
              <div className="flex items-center justify-center gap-2 border-t border-zinc-100 py-3 dark:border-zinc-800">
                <p className="text-xs text-zinc-400">{filtered.length}명 표시 중</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MatchTab({ data, bracket, displayBracket, matchResults, busy, onDraw, onStart, onFinish, onSetWinner, onPatchFormat, onPatchSettings, onToggleBracket, showBracket }: {
  data: TournamentPayload;
  bracket: BracketData | null;
  displayBracket: BracketData | null;
  matchResults: MatchResults;
  busy: string | null;
  onDraw: () => void;
  onStart: () => void;
  onFinish: () => void;
  onSetWinner: (key: string, w: "left" | "right" | null) => void;
  onPatchFormat: (f: DrawFormat) => void;
  onPatchSettings: (p: { splitClassCount?: number; seedBy?: SeedBy }) => void;
  onToggleBracket: () => void;
  showBracket: boolean;
}) {
  const collected = useMemo(() => parseCollectedFieldsJson(data.collectedFieldsJson ?? "[]"), [data.collectedFieldsJson]);
  const currentFormat = data.format as DrawFormat;
  const seedBy = (data.seedBy === "weightKg" || data.seedBy === "heightCm" ? data.seedBy : "random") as SeedBy;
  const minPlayers = currentFormat === "WEIGHT_CLASS" || currentFormat === "HEIGHT_CLASS" ? 1 : 2;
  const canDraw = data.participants.length >= minPlayers;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Format selection */}
      {!data.startedAt && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">경기 운영 방식</h3>
          <p className="mt-1 text-xs text-zinc-500">방식을 고른 뒤 대진 생성으로 매칭합니다.</p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {FORMATS.map((f) => (
              <label
                key={f.value}
                className={[
                  "cursor-pointer rounded-xl border p-3.5 transition-all",
                  currentFormat === f.value
                    ? "border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/20"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600",
                ].join(" ")}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="format"
                    checked={currentFormat === f.value}
                    onChange={() => onPatchFormat(f.value)}
                    disabled={Boolean(data.startedAt)}
                    className="mt-0.5 accent-red-500"
                  />
                  <span>
                    <span className={`text-sm font-semibold ${currentFormat === f.value ? "text-red-700 dark:text-red-300" : "text-zinc-800 dark:text-zinc-100"}`}>
                      {f.label}
                    </span>
                    <p className="mt-0.5 text-xs text-zinc-500">{f.hint}</p>
                  </span>
                </div>
              </label>
            ))}
          </div>

          {(currentFormat === "WEIGHT_CLASS" || currentFormat === "HEIGHT_CLASS") && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-950/20">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">조 개수</span>
                <AnimatedSelect
                  aria-label="조 개수"
                  className="max-w-xs"
                  value={String(data.splitClassCount)}
                  disabled={Boolean(busy) || Boolean(data.startedAt)}
                  onChange={(v) => onPatchSettings({ splitClassCount: Number(v) })}
                  options={[2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}조` }))}
                />
              </label>
            </div>
          )}

          <div className="mt-4">
            <label className="flex max-w-xs flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">시드 방식</span>
              <AnimatedSelect
                aria-label="시드 방식"
                value={seedBy}
                disabled={Boolean(busy) || Boolean(data.startedAt)}
                onChange={(v) => onPatchSettings({ seedBy: v as SeedBy })}
                options={[
                  { value: "random", label: "랜덤" },
                  { value: "weightKg", label: "몸무게 가벼운 순", disabled: !collected.includes("weightKg") },
                  { value: "heightCm", label: "키 작은 순", disabled: !collected.includes("heightCm") },
                ]}
              />
            </label>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {!data.startedAt && (
          <button
            type="button"
            disabled={Boolean(busy) || !canDraw}
            onClick={onDraw}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
          >
            {busy === "draw" ? "대진 생성 중…" : "대진 생성 (매칭)"}
          </button>
        )}
        {bracket && (
          <button
            type="button"
            onClick={onToggleBracket}
            className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800 transition"
          >
            {showBracket ? "대진표 접기" : "대진표 보기"}
          </button>
        )}
        {showBracket && bracket && (
          <PdfExportButton fileName={`${data.title}-대진표`} targetId={PRINT_ID} />
        )}
        {bracket && !data.startedAt && (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={onStart}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
          >
            {busy === "start" ? "처리 중…" : "대회 시작"}
          </button>
        )}
        {bracket && data.startedAt && !data.endedAt && (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={onFinish}
            className="rounded-xl border border-zinc-400 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-500 dark:hover:bg-zinc-800 transition"
          >
            {busy === "finish" ? "처리 중…" : "대회 종료"}
          </button>
        )}
      </div>

      {!canDraw && !data.startedAt && (
        <p className="text-xs text-zinc-500">
          {currentFormat === "WEIGHT_CLASS" || currentFormat === "HEIGHT_CLASS"
            ? "참가자 1명 이상이면 생성할 수 있습니다."
            : "참가자 2명 이상이면 생성할 수 있습니다."}
        </p>
      )}

      {/* Bracket display */}
      {showBracket && bracket && (
        <div
          id={PRINT_ID}
          className={[
            "rounded-2xl border-2 p-5 shadow-sm",
            data.startedAt
              ? "border-emerald-400/40 bg-white dark:bg-zinc-950"
              : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950",
          ].join(" ")}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-zinc-500">{data.title}</p>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {data.startedAt ? "결과 반영 · 경기 기록" : "대진표 (미리보기)"}
              </h3>
            </div>
            {data.startedAt && !data.endedAt && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          {data.startedAt ? (
            <p className="mb-4 text-sm text-zinc-500">이긴 쪽 이름을 눌러 승자를 기록하세요.</p>
          ) : (
            <p className="mb-4 text-sm text-zinc-500">대회 시작 후에만 승패를 기록할 수 있습니다.</p>
          )}
          <div className="overflow-x-auto">
            <BracketView
              data={displayBracket ?? bracket}
              results={matchResults}
              editable={Boolean(data.startedAt) && !data.endedAt}
              onSetWinner={data.startedAt && !data.endedAt ? (key, w) => onSetWinner(key, w) : undefined}
            />
          </div>
        </div>
      )}

      {!bracket && (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          대진 생성으로 매칭 후 대진표를 확인하세요.
        </div>
      )}
    </div>
  );
}

function RecordsTab({ data, matchResults, displayBracket, bracket }: {
  data: TournamentPayload;
  matchResults: MatchResults;
  displayBracket: BracketData | null;
  bracket: BracketData | null;
}) {
  const resultEntries = Object.entries(matchResults);
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">경기 기록</h3>
        {resultEntries.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">아직 기록된 경기 결과가 없습니다.</p>
        ) : (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-zinc-500">총 {resultEntries.length}경기 결과 기록됨</p>
            <div className="overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">경기 ID</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">결과</th>
                  </tr>
                </thead>
                <tbody>
                  {resultEntries.map(([key, winner]) => (
                    <tr key={key} className="border-b border-zinc-50 dark:border-zinc-800">
                      <td className="px-4 py-2 font-mono text-xs text-zinc-500">{key}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          winner === "left" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                        }`}>
                          {winner === "left" ? "왼쪽 승" : "오른쪽 승"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Status summary */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">대회 상태</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">상태</dt>
            <dd><StatusBadge startedAt={data.startedAt} endedAt={data.endedAt} /></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">참가자 수</dt>
            <dd className="font-medium text-zinc-800 dark:text-zinc-100">{data.participants.length}명</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">기록된 경기</dt>
            <dd className="font-medium text-zinc-800 dark:text-zinc-100">{resultEntries.length}경기</dd>
          </div>
        </dl>
      </div>
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
  const [showBracket, setShowBracket] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("info");

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
      if (!res.ok) { setLoadErr(json.error ?? "불러오지 못했습니다."); setData(null); return; }
      setData(json);
      const b = parseBracket(json.bracketJson);
      const raw = parseMatchResultsJson(json.matchResultsJson);
      setMatchResults(b ? { ...computeByeAutoResults(b), ...raw } : raw);
    } finally {
      setLoading(false);
    }
  }, [secret, tournamentId]);

  useEffect(() => { if (!clientReady) return; void fetchData(); }, [clientReady, fetchData]);

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

  const joinUrl = useMemo(() => typeof window !== "undefined" && data ? `${window.location.origin}/join/${data.code}` : "", [data]);
  const publicProgressUrl = useMemo(() => typeof window !== "undefined" && data ? `${window.location.origin}/t/${data.code}` : "", [data]);
  const manageBookmarkUrl = useMemo(() => typeof window !== "undefined" && secret ? `${window.location.origin}/manage/${tournamentId}?k=${encodeURIComponent(secret)}` : "", [secret, tournamentId]);

  async function copyWithNotice(text: string, okMsg: string) {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); setCopyFeedback(okMsg); }
    catch { setCopyFeedback("복사에 실패했습니다."); }
    window.setTimeout(() => setCopyFeedback(null), 2800);
  }

  async function patchMatch(matchKey: string, winner: "left" | "right" | null) {
    setBusy("match");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", ...manageHeaders(secret) },
        body: JSON.stringify({ matchKey, winner }),
      });
      const j = (await res.json()) as { error?: string; matchResults?: MatchResults };
      if (!res.ok) { alert(j.error ?? "저장 실패"); return; }
      if (j.matchResults) setMatchResults(j.matchResults);
      await fetchData();
    } finally { setBusy(null); }
  }

  async function deleteTournament() {
    if (!data?.isOwner) return;
    if (!confirm("이 대회와 모든 참가·대진 데이터가 삭제됩니다. 계속할까요?")) return;
    setBusy("delT");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, { method: "DELETE", credentials: "include", headers: manageHeaders(secret) });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) { alert(j.error ?? "삭제 실패"); return; }
      router.push("/my");
    } finally { setBusy(null); }
  }

  async function finishTournament() {
    if (!data?.startedAt || data?.endedAt) return;
    if (!confirm("대회를 종료하면 경기 결과를 더 이상 수정할 수 없습니다. 진행할까요?")) return;
    setBusy("finish");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/finish`, { method: "POST", credentials: "include", headers: manageHeaders(secret) });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) { alert(j.error ?? "종료 처리 실패"); return; }
      await fetchData();
    } finally { setBusy(null); }
  }

  async function startTournament() {
    if (!data?.bracketJson) return;
    if (!confirm("대회를 시작하면 대진·방식을 바꿀 수 없습니다. 진행할까요?")) return;
    setBusy("start");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/start`, { method: "POST", credentials: "include", headers: manageHeaders(secret) });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) { alert(j.error ?? "시작 처리 실패"); return; }
      await fetchData(); setShowBracket(true);
    } finally { setBusy(null); }
  }

  async function patchSettings(partial: { splitClassCount?: number; seedBy?: SeedBy }) {
    setBusy("settings");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/settings`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", ...manageHeaders(secret) },
        body: JSON.stringify(partial),
      });
      if (!res.ok) { const j = (await res.json()) as { error?: string }; alert(j.error ?? "저장 실패"); return; }
      await fetchData();
    } finally { setBusy(null); }
  }

  async function patchFormat(f: DrawFormat) {
    setBusy("format");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/format`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", ...manageHeaders(secret) },
        body: JSON.stringify({ format: f }),
      });
      if (!res.ok) { const j = (await res.json()) as { error?: string }; alert(j.error ?? "저장 실패"); return; }
      await fetchData();
    } finally { setBusy(null); }
  }

  async function runDraw() {
    setBusy("draw");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/draw`, { method: "POST", credentials: "include", headers: manageHeaders(secret) });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) { alert(j.error ?? "대진 추첨 실패"); return; }
      await fetchData(); setShowBracket(true);
    } finally { setBusy(null); }
  }

  async function deleteParticipants(ids?: string[]) {
    if (!data) return;
    if (ids) {
      if (!confirm(`선택한 ${ids.length}명을 삭제할까요?`)) return;
    } else {
      if (!confirm("모든 참가자를 삭제할까요? 대진표도 초기화됩니다.")) return;
    }
    setBusy("del");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json", ...manageHeaders(secret) },
        body: JSON.stringify(ids ? { ids } : { all: true }),
      });
      if (!res.ok) { const j = (await res.json()) as { error?: string }; alert(j.error ?? "삭제 실패"); return; }
      await fetchData();
    } finally { setBusy(null); }
  }

  if (!clientReady) return <ManageShell />;
  if (loading && !data) return <ManageShell />;

  if (loadErr || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{loadErr ?? "오류"}</p>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          운영 비밀 링크(?k= 포함)로 들어오거나, 이 대회를 만든 계정으로{" "}
          <Link href="/login" className="text-red-600 underline">로그인</Link>한 뒤 &quot;내 대회&quot;에서 열어 주세요.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm underline text-zinc-500">홈으로</Link>
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "info", label: "정보" },
    { key: "participants", label: "참가팀" },
    { key: "match", label: "경기" },
    { key: "records", label: "기록" },
  ];

  return (
    <DashboardShell
      title={data.title || "무제 대회"}
      breadcrumb={[{ label: "대진표", href: "/my" }, { label: data.title || "무제 대회" }]}
      activeKey="bracket"
      topRight={
        <Link href={publicProgressUrl || "#"} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition">
          대진표 보기
        </Link>
      }
    >
      <div className="flex flex-col">
        {/* Tournament hero card */}
        <div className="px-4 pt-5 sm:px-6">
          <div className="rounded-2xl bg-gradient-to-r from-red-600 to-red-500 p-5 text-white shadow-md shadow-red-500/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                  <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-white" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold">{data.title || "무제 대회"}</h2>
                    <StatusBadge startedAt={data.startedAt} endedAt={data.endedAt} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/80">
                    <span className="flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      </svg>
                      {data.participants.length}팀 참가
                    </span>
                    <span className="font-mono text-white/70">코드 {data.code}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void copyWithNotice(data.code, "참가 코드가 복사되었습니다.")}
                className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 transition"
              >
                코드 복사
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-[57px] z-20 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
          <nav className="flex gap-0 px-4 sm:px-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "relative px-4 py-3.5 text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                ].join(" ")}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-red-500" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        {activeTab === "info" && (
          <InfoTab
            data={data}
            joinUrl={joinUrl}
            publicProgressUrl={publicProgressUrl}
            manageBookmarkUrl={manageBookmarkUrl}
            secret={secret}
            busy={busy}
            onDelete={() => void deleteTournament()}
            onCopy={copyWithNotice}
            copyFeedback={copyFeedback}
          />
        )}
        {activeTab === "participants" && (
          <ParticipantsTab
            data={data}
            busy={busy}
            onDeleteSelected={(ids) => void deleteParticipants(ids)}
            onDeleteAll={() => void deleteParticipants()}
          />
        )}
        {activeTab === "match" && (
          <MatchTab
            data={data}
            bracket={bracket}
            displayBracket={displayBracket}
            matchResults={matchResults}
            busy={busy}
            onDraw={() => void runDraw()}
            onStart={() => void startTournament()}
            onFinish={() => void finishTournament()}
            onSetWinner={(key, w) => void patchMatch(key, w)}
            onPatchFormat={(f) => void patchFormat(f)}
            onPatchSettings={(p) => void patchSettings(p)}
            onToggleBracket={() => setShowBracket((v) => !v)}
            showBracket={showBracket}
          />
        )}
        {activeTab === "records" && (
          <RecordsTab
            data={data}
            matchResults={matchResults}
            displayBracket={displayBracket}
            bracket={bracket}
          />
        )}
      </div>

      {/* Toast feedback */}
      {copyFeedback && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-500/40 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-900 shadow-lg dark:border-emerald-600/50 dark:bg-emerald-950/90 dark:text-emerald-100"
        >
          {copyFeedback}
        </div>
      )}
    </DashboardShell>
  );
}

export function ManageClient({ tournamentId }: { tournamentId: string }) {
  return (
    <Suspense fallback={<ManageShell />}>
      <ManageInner tournamentId={tournamentId} />
    </Suspense>
  );
}

"use client";

import { useState } from "react";

type Props = {
  url: string;
  /** 파일명에 쓰일 문자열 (확장자 제외, 특수문자는 대시로 치환) */
  fileBaseName: string;
  disabled?: boolean;
  /** 다운로드 트리거 직후 안내 (토스트 등) */
  onNotice?: (message: string) => void;
  className?: string;
};

function safeFilePart(s: string): string {
  const t = s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
  return t.slice(0, 80) || "join";
}

export function JoinQrDownloadButton({ url, fileBaseName, disabled, onNotice, className }: Props) {
  const [busy, setBusy] = useState(false);

  async function download() {
    if (!url || disabled) return;
    setBusy(true);
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#18181b", light: "#ffffff" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${safeFilePart(fileBaseName)}-참가QR.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      onNotice?.("참가 링크 QR 이미지를 저장했습니다.");
    } catch (e) {
      console.error(e);
      onNotice?.("QR 이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={busy || !url || disabled}
      className={
        className ??
        "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:min-h-0 sm:w-auto"
      }
    >
      {busy ? "QR 만드는 중…" : "참가 링크 QR 저장 (PNG)"}
    </button>
  );
}

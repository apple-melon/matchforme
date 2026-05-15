"use client";

import { useState } from "react";

type Props = { fileName: string; targetId: string };

function addImageMultiPage(
  pdf: import("jspdf").jsPDF,
  imgData: string,
  canvasW: number,
  canvasH: number,
) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;
  const renderW = usableW;
  const renderH = (canvasH * renderW) / canvasW;
  const pages = Math.max(1, Math.ceil(renderH / usableH));

  for (let i = 0; i < pages; i++) {
    if (i > 0) pdf.addPage();
    const y = margin - i * usableH;
    pdf.addImage(imgData, "PNG", margin, y, renderW, renderH, undefined, "FAST");
  }
}

export function PdfExportButton({ fileName, targetId }: Props) {
  const [busy, setBusy] = useState(false);

  async function download() {
    const el = document.getElementById(targetId);
    if (!el) {
      alert("대진표 영역을 찾을 수 없습니다. 먼저 대진표 보기를 켜 주세요.");
      return;
    }
    setBusy(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const w = Math.ceil(Math.max(el.scrollWidth, el.clientWidth, (el as HTMLElement).offsetWidth));
      const h = Math.ceil(Math.max(el.scrollHeight, el.clientHeight, (el as HTMLElement).offsetHeight));

      const canvas = await html2canvas(el as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: w,
        height: h,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        windowWidth: w,
        windowHeight: h,
        foreignObjectRendering: false,
        onclone: (clonedDoc) => {
          // Remove dark mode so only light-mode Tailwind classes apply — preserves winner/loser highlights
          clonedDoc.documentElement.classList.remove("dark");
          const box = clonedDoc.getElementById(targetId);
          if (!box) return;
          box.style.overflow = "visible";
          box.style.height = "auto";
          box.style.maxHeight = "none";
          box.style.backgroundColor = "#ffffff";
          // Fix scrollable/clipped containers so nothing is cut off
          const allEls = box.querySelectorAll<HTMLElement>("*");
          allEls.forEach((el) => {
            el.style.fontFamily = 'system-ui, "Segoe UI", sans-serif';
            el.style.boxShadow = "none";
            const ov = el.style.overflow || window.getComputedStyle(el).overflow;
            if (ov === "hidden" || ov === "scroll" || ov === "auto" ||
                el.classList.contains("overflow-x-auto") ||
                el.classList.contains("overflow-y-auto") ||
                el.classList.contains("overflow-hidden")) {
              el.style.overflow = "visible";
            }
          });
        },
      });

      if (canvas.width < 2 || canvas.height < 2) {
        throw new Error("캔버스가 비어 있습니다.");
      }

      const img = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      addImageMultiPage(pdf, img, canvas.width, canvas.height);

      const name = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
      pdf.save(name);
    } catch (e) {
      console.error(e);
      alert(
        "PDF를 만들지 못했습니다. 브라우저를 최신으로 유지하거나, 팝업·다운로드 차단을 해제한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
    >
      {busy ? (
        <>
          <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
          PDF 생성 중…
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          PDF 다운로드
        </>
      )}
    </button>
  );
}

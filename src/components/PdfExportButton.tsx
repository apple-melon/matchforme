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
      window.scrollTo(0, 0);

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(el, {
        scale: Math.min(2, window.devicePixelRatio > 1 ? 2 : 1.5),
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        onclone: (clonedDoc) => {
          const box = clonedDoc.getElementById(targetId);
          if (!box) return;
          const stack: HTMLElement[] = [box];
          while (stack.length) {
            const n = stack.pop()!;
            n.style.fontFamily = 'system-ui, "Segoe UI", sans-serif';
            n.style.boxShadow = "none";
            n.style.setProperty("background-color", "#ffffff", "important");
            n.style.setProperty("color", "#18181b", "important");
            n.style.setProperty("border-color", "#d4d4d8", "important");
            for (let i = 0; i < n.children.length; i++) {
              const c = n.children[i];
              if (c instanceof HTMLElement) stack.push(c);
            }
          }
        },
      });

      if (canvas.width < 2 || canvas.height < 2) {
        throw new Error("캔버스가 비어 있습니다.");
      }

      const img = canvas.toDataURL("image/png");
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
      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
    >
      {busy ? "PDF 생성 중…" : "PDF로 다운로드"}
    </button>
  );
}

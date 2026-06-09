import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { REPORTES_THEME } from "@/lib/reportesTheme";

const PDF_ROOT_ID = "reportes-pdf-root";
const PAGE_MARGIN_MM = REPORTES_THEME.pdf.pageMarginMm;
const CAPTURE_SCALE = 3;

/** Fase 4: @react-pdf/renderer deferred — html2canvas + pagination is sufficient for internal reports. */
export const PDF_EXPORT_STRATEGY = "html2canvas-v2";

export function buildReportesFileName({ desde, hasta }) {
  return `Reportes EMAT ${desde}_${hasta}.pdf`;
}

export async function waitForChartsPaint(rootEl) {
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  if (rootEl && typeof ResizeObserver !== "undefined") {
    await new Promise((resolve) => {
      let stable = 0;
      const observer = new ResizeObserver(() => {
        stable += 1;
        if (stable >= 2) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(rootEl);
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 1200);
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
}

function drawPageChrome(doc, { pageIndex, totalPages, meta, pageH, pageW }) {
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  if (pageIndex > 1) {
    doc.text("EMAT Celulosa · Informe Comercial", PAGE_MARGIN_MM, 6);
    if (meta?.desde && meta?.hasta) {
      doc.text(
        `${meta.desde} — ${meta.hasta}`,
        pageW - PAGE_MARGIN_MM,
        6,
        { align: "right" },
      );
    }
  }
  const footer = [
    "EMAT Celulosa · Confidencial · Uso interno",
    meta?.generatedBy ? `Generado por ${meta.generatedBy}` : null,
    `Página ${pageIndex} de ${totalPages}`,
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(footer, PAGE_MARGIN_MM, pageH - 5);
}

function addCanvasSlicesToDoc(doc, canvas, { maxW, maxH, pageMargin, pageState }) {
  const imgW = canvas.width;
  const imgH = canvas.height;
  const sliceHeightPx = Math.floor((maxH / maxW) * imgW);

  if (imgH <= sliceHeightPx) {
    const imgData = canvas.toDataURL("image/png");
    let drawW = maxW;
    let drawH = (imgH * drawW) / imgW;
    if (drawH > maxH) drawH = maxH;

    if (!pageState.isFirstPage) doc.addPage();
    pageState.isFirstPage = false;

    doc.addImage(imgData, "PNG", pageMargin, pageMargin, drawW, drawH);
    return 1;
  }

  let yOffset = 0;
  let pages = 0;
  while (yOffset < imgH) {
    const sliceH = Math.min(sliceHeightPx, imgH - yOffset);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = imgW;
    sliceCanvas.height = sliceH;
    const ctx = sliceCanvas.getContext("2d");
    ctx.drawImage(canvas, 0, yOffset, imgW, sliceH, 0, 0, imgW, sliceH);

    const sliceData = sliceCanvas.toDataURL("image/png");
    const drawW = maxW;
    const drawH = (sliceH * drawW) / imgW;

    if (!pageState.isFirstPage) doc.addPage();
    pageState.isFirstPage = false;

    doc.addImage(sliceData, "PNG", pageMargin, pageMargin, drawW, drawH);
    yOffset += sliceH;
    pages += 1;
  }
  return pages;
}

export async function buildReportesPdfFromElement(rootEl, { meta = {}, onProgress } = {}) {
  if (!rootEl) throw new Error("No se encontró el layout de exportación");

  await waitForChartsPaint(rootEl);

  const sections = rootEl.querySelectorAll("[data-pdf-section]");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - PAGE_MARGIN_MM * 2;
  const maxH = pageH - PAGE_MARGIN_MM * 2 - 8;
  const pageState = { isFirstPage: true };

  const totalSections = sections.length;
  let sectionIndex = 0;

  for (const section of sections) {
    sectionIndex += 1;
    onProgress?.({ sectionIndex, totalSections });

    const canvas = await html2canvas(section, {
      scale: CAPTURE_SCALE,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    addCanvasSlicesToDoc(doc, canvas, {
      maxW,
      maxH,
      pageMargin: PAGE_MARGIN_MM,
      pageState,
    });

    canvas.width = 0;
    canvas.height = 0;
  }

  const generatedAt = new Date().toLocaleString("es-AR");
  doc.setProperties({
    title: buildReportesFileName({ desde: meta.desde || "", hasta: meta.hasta || "" }),
    subject: "Informe comercial EMAT",
    author: meta.generatedBy || "EMAT CRM",
    keywords: "reportes, EMAT, presupuestos, CRM",
    creator: "EMAT CRM",
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    drawPageChrome(doc, {
      pageIndex: i,
      totalPages,
      meta: { ...meta, generatedAt },
      pageH,
      pageW,
    });
  }

  return doc;
}

/**
 * @typedef {Object} ReportPdfMeta
 * @property {string} [title]
 * @property {string} [dateCriteriaLabel]
 * @property {string} [asesorLabel]
 * @property {number} [totalCount]
 * @property {number} [previousCount]
 * @property {string} [prevDesde]
 * @property {string} [prevHasta]
 * @property {string} [generatedBy]
 */

/**
 * @typedef {Object} DownloadReportesPdfOptions
 * @property {string} [desde]
 * @property {string} [hasta]
 * @property {ReportPdfMeta} [meta]
 * @property {(progress: { sectionIndex: number, totalSections: number }) => void} [onProgress]
 */

/**
 * @param {DownloadReportesPdfOptions} [options]
 */
export async function downloadReportesPdf({ desde, hasta, meta = {}, onProgress } = {}) {
  const rootEl = document.getElementById(PDF_ROOT_ID);
  const doc = await buildReportesPdfFromElement(rootEl, {
    meta: { ...meta, desde, hasta },
    onProgress,
  });
  doc.save(buildReportesFileName({ desde, hasta }));
}

export { PDF_ROOT_ID };

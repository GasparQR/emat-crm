import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PDF_ROOT_ID = "reportes-pdf-root";
const PAGE_MARGIN_MM = 10;

export function buildReportesFileName({ desde, hasta }) {
  return `Reportes EMAT ${desde}_${hasta}.pdf`;
}

export async function waitForChartsPaint() {
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  await new Promise((resolve) => setTimeout(resolve, 450));
}

export async function buildReportesPdfFromElement(rootEl) {
  if (!rootEl) throw new Error("No se encontró el layout de exportación");

  await waitForChartsPaint();

  const sections = rootEl.querySelectorAll("[data-pdf-section]");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - PAGE_MARGIN_MM * 2;
  const maxH = pageH - PAGE_MARGIN_MM * 2;

  let isFirstPage = true;

  for (const section of sections) {
    const canvas = await html2canvas(section, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    let drawW = maxW;
    let drawH = (canvas.height * drawW) / canvas.width;

    if (drawH > maxH) {
      drawH = maxH;
      drawW = (canvas.width * drawH) / canvas.height;
    }

    if (!isFirstPage) doc.addPage();
    isFirstPage = false;

    doc.addImage(
      imgData,
      "PNG",
      PAGE_MARGIN_MM,
      PAGE_MARGIN_MM,
      drawW,
      drawH,
    );
  }

  const totalPages = doc.getNumberOfPages();
  const generatedAt = new Date().toLocaleString("es-AR");
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generado el ${generatedAt} · Página ${i} de ${totalPages}`, PAGE_MARGIN_MM, pageH - 5);
  }

  return doc;
}

export async function downloadReportesPdf({ desde, hasta }) {
  const rootEl = document.getElementById(PDF_ROOT_ID);
  const doc = await buildReportesPdfFromElement(rootEl);
  doc.save(buildReportesFileName({ desde, hasta }));
}

export { PDF_ROOT_ID };

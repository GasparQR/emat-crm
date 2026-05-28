import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildConsultaPdf, normalizeConsulta, buildConsultaFileName } from "@/lib/consultaPdf";

export default function ConsultaPdfPreviewDialog({ consulta, open, onOpenChange }) {
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [previewPayload, setPreviewPayload] = useState(null);

  useEffect(() => {
    if (!open || !consulta) return;

    const payload = normalizeConsulta(consulta);
    const doc = buildConsultaPdf(payload);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    setPreviewPayload(payload);
    setPdfPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, consulta?.id]);

  const handleOpenChange = (next) => {
    if (!next) {
      setPdfPreviewUrl("");
      setPreviewPayload(null);
    }
    onOpenChange(next);
  };

  const downloadPdf = () => {
    if (!previewPayload) return;
    const doc = buildConsultaPdf(previewPayload);
    doc.save(buildConsultaFileName(previewPayload));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Vista preliminar del presupuesto</DialogTitle>
        </DialogHeader>
        <div className="w-full h-[70vh] rounded-md border overflow-hidden bg-slate-100">
          {pdfPreviewUrl ? (
            <iframe title="Vista previa PDF" src={pdfPreviewUrl} className="w-full h-full" />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No se pudo generar la vista previa.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cerrar</Button>
          <Button onClick={downloadPdf} disabled={!previewPayload}>
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

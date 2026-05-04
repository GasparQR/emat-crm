import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import SelectorListasWhatsApp from "./SelectorListasWhatsApp";
import HistorialEnvios from "./HistorialEnvios";
import { openConsultaPdf } from "@/lib/consultaPdf";
import moment from "moment";
import { X, FileText } from "lucide-react";

function Field({ label, children, empty, className = "" }) {
  if (empty) return null;
  return (
    <div className={className}>
      <Label className="text-xs font-semibold text-slate-500">{label}</Label>
      <div className="text-sm mt-1">{children}</div>
    </div>
  );
}

export default function DetalleConsultaDialog({
  consulta,
  open,
  onOpenChange,
  onSave,
  mode = "full",
}) {
  if (!consulta) return null;

  const logistica = mode === "logistica";
  const item0 = Array.isArray(consulta.items) && consulta.items.length > 0 ? consulta.items[0] : null;
  const detalleServicio =
    item0?.descripcionServicio ??
    item0?.descripcionservicio ??
    consulta.descripcionservicio ??
    consulta.descripcionServicio;

  const handleClose = () => {
    onOpenChange(false);
  };

  const infoGrid = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Detalle del presupuesto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nº presupuesto" empty={!consulta.nroppto}>
            #{consulta.nroppto}
          </Field>
          <Field label="Período" empty={!consulta.mes && !consulta.ano}>
            {consulta.mes} {consulta.ano}
          </Field>
          <Field label="Contacto">{consulta.contactonombre}</Field>
          <Field label="WhatsApp / tel." empty={!consulta.contactowhatsapp}>
            {consulta.contactowhatsapp}
          </Field>
          <Field label="Asesor" empty={!consulta.asesor}>
            {consulta.asesor}
          </Field>
          <Field label="Canal de origen" empty={!(consulta.canalOrigen ?? consulta.canalorigen)}>
            {consulta.canalOrigen ?? consulta.canalorigen}
          </Field>
          <Field label="Etapa">
            <Badge className="mt-0">{consulta.pipeline_stage}</Badge>
          </Field>
          <Field label="Ubicación obra" empty={!consulta.ubicacionobra}>
            {consulta.ubicacionobra}
          </Field>
          <Field label="Provincia" empty={!consulta.provincia}>
            {consulta.provincia}
          </Field>
          <Field label="Tipo aplicación" empty={!consulta.tipoaplicacion}>
            {consulta.tipoaplicacion}
          </Field>
          <Field label="Superficie (m²)" empty={!consulta.superficiem2}>
            {consulta.superficiem2}
          </Field>
          <Field label="Importe" empty={!consulta.importe}>
            $ {Number(consulta.importe).toLocaleString("es-AR")}
          </Field>
          <Field label="Detalle / servicio" empty={!detalleServicio}>
            {detalleServicio}
          </Field>
          <Field label="Próximo seguimiento" empty={!consulta.proximoseguimiento}>
            {moment(consulta.proximoseguimiento).format("DD/MM/YYYY")}
          </Field>
          <Field label="Notas (interno)" empty={!consulta.notas} className="col-span-2">
            <span className="text-slate-700 whitespace-pre-wrap">{consulta.notas}</span>
          </Field>
          {consulta.prioridad && (
            <Field label="Prioridad">
              <Badge variant="secondary">{consulta.prioridad}</Badge>
            </Field>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>{consulta.contactonombre}</span>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {logistica ? (
          infoGrid
        ) : (
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              {infoGrid}
            </TabsContent>

            <TabsContent value="whatsapp">
              <SelectorListasWhatsApp
                contactoId={consulta.contactoId}
                contactoWhatsapp={consulta.contactowhatsapp}
                consultaId={consulta.id}
                onMessageSent={onSave}
              />
            </TabsContent>

            <TabsContent value="historial">
              <HistorialEnvios
                contactoId={consulta.contactoId}
                consultaId={consulta.id}
              />
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {logistica && (
            <Button
              className="gap-2"
              onClick={() => openConsultaPdf(consulta)}
            >
              <FileText className="w-4 h-4" />
              Ver PDF
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

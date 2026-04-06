import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SelectorListasWhatsApp from "./SelectorListasWhatsApp";
import HistorialEnvios from "./HistorialEnvios";
import moment from "moment";
import { X } from "lucide-react";

export default function DetalleConsultaDialog({ consulta, open, onOpenChange, onSave }) {
  if (!consulta) return null;

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{consulta.contactoNombre}</span>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalles de la consulta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Contacto</Label>
                    <p className="text-sm mt-1">{consulta.contactoNombre}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">WhatsApp</Label>
                    <p className="text-sm mt-1">{consulta.contactoWhatsapp}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Producto</Label>
                    <p className="text-sm mt-1">{consulta.productoConsultado}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Categoría</Label>
                    <p className="text-sm mt-1">{consulta.categoriaProducto}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Etapa</Label>
                    <Badge className="mt-1">{consulta.etapa}</Badge>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Prioridad</Label>
                    <Badge className="mt-1">{consulta.prioridad}</Badge>
                  </div>
                  {consulta.precioCotizado && (
                    <div>
                      <Label className="text-xs font-semibold text-slate-500">Precio</Label>
                      <p className="text-sm mt-1 font-bold">
                        {consulta.moneda === "USD" ? "US$" : "$"} {consulta.precioCotizado.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {consulta.proximoSeguimiento && (
                    <div>
                      <Label className="text-xs font-semibold text-slate-500">Próximo seguimiento</Label>
                      <p className="text-sm mt-1">{moment(consulta.proximoSeguimiento).format("DD/MM/YYYY")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp">
            <SelectorListasWhatsApp
              contactoId={consulta.contactoId}
              contactoWhatsapp={consulta.contactoWhatsapp}
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
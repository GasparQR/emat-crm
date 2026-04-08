import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import SelectorListasWhatsApp from "./SelectorListasWhatsApp";
import HistorialEnvios from "./HistorialEnvios";
import { X, MapPin, Phone } from "lucide-react";

export default function DetalleContactoDialog({ contacto, open, onOpenChange }) {
  if (!contacto) return null;

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{contacto.nombre} {contacto.apellido}</span>
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
                <CardTitle className="text-base">Detalles del contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Nombre</Label>
                    <p className="text-sm mt-1">{contacto.nombre} {contacto.apellido}</p>
                  </div>
                  <div className="flex items-end gap-2">
                    <div>
                      <Label className="text-xs font-semibold text-slate-500">WhatsApp</Label>
                      <p className="text-sm mt-1">{contacto.whatsapp}</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-[#25D366] hover:bg-[#20bd5a] text-white"
                      onClick={() => window.open(`https://wa.me/${contacto.whatsapp}`, "_blank")}
                    >
                      <Phone className="w-3 h-3" />
                    </Button>
                  </div>
                  {contacto.localidad && (
                    <div>
                      <Label className="text-xs font-semibold text-slate-500">localidad</Label>
                      <div className="flex items-center gap-1 text-sm mt-1">
                        <MapPin className="w-3 h-3" />
                        {contacto.localidad}
                      </div>
                    </div>
                  )}
                  {contacto.canalOrigen && (
                    <div>
                      <Label className="text-xs font-semibold text-slate-500">Canal de origen</Label>
                      <Badge className="mt-1">{contacto.canalOrigen}</Badge>
                    </div>
                  )}
                </div>
                {contacto.tags?.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {contacto.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {contacto.notas && (
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Notas</Label>
                    <p className="text-sm mt-1 text-slate-600">{contacto.notas}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp">
            <SelectorListasWhatsApp
              contactoId={contacto.id}
              contactoWhatsapp={contacto.whatsapp}
              onMessageSent={() => {}}
            />
          </TabsContent>

          <TabsContent value="historial">
            <HistorialEnvios contactoId={contacto.id} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

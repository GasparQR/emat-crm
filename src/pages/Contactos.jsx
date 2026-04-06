import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Phone, MessageCircle, MapPin, User, ArrowLeft, Trash2, ListCheck } from "lucide-react";
import { toast } from "sonner";
import DetalleContactoDialog from "@/components/crm/DetalleContactoDialog";
import DialogSelectorListasWhatsApp from "@/components/crm/DialogSelectorListasWhatsApp";

const CANALES = ["Instagram", "WhatsApp", "MercadoLibre", "Referido", "Local", "Otro"];

export default function Contactos() {
  const [showForm, setShowForm] = useState(false);
  const [showDetalleDialog, setShowDetalleDialog] = useState(false);
  const [showListasDialog, setShowListasDialog] = useState(false);
  const [selectedContacto, setSelectedContacto] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroCanal, setFiltroCanal] = useState("todos");
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    whatsapp: "",
    numeroTelefono: "",
    ciudad: "",
    canalOrigen: "",
    notas: "",
    tags: []
  });

  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { workspace } = useWorkspace();

  const { data: contactos = [], refetch } = useQuery({
    queryKey: ['contactos', workspace?.id],
    queryFn: () => workspace ? base44.entities.Contacto.filter({ workspace_id: workspace.id }, "nombre", 2000) : [],
    enabled: !!workspace
  });

  const { data: consultas = [] } = useQuery({
    queryKey: ['consultas-contactos', workspace?.id],
    queryFn: () => workspace ? base44.entities.Consulta.filter({ workspace_id: workspace.id }, "-created_date", 1000) : [],
    enabled: !!workspace
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contacto.create({ ...data, workspace_id: workspace?.id }),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['contactos', workspace?.id] });
       toast.success("Contacto creado");
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contacto.update(id, data),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['contactos', workspace?.id] });
       toast.success("Contacto actualizado");
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contacto.delete(id),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['contactos', workspace?.id] });
       toast.success("Contacto eliminado");
    }
  });

  const resetForm = () => {
    setFormData({
      nombre: "",
      apellido: "",
      whatsapp: "",
      numeroTelefono: "",
      ciudad: "",
      canalOrigen: "",
      notas: "",
      tags: []
    });
    setSelectedContacto(null);
    setShowForm(false);
  };

  const handleEdit = (contacto) => {
    setSelectedContacto(contacto);
    setFormData({
      nombre: contacto.nombre || "",
      apellido: contacto.apellido || "",
      whatsapp: contacto.whatsapp || "",
      numeroTelefono: contacto.numeroTelefono || "",
      ciudad: contacto.ciudad || "",
      canalOrigen: contacto.canalOrigen || "",
      notas: contacto.notas || "",
      tags: contacto.tags || []
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.nombre || !formData.whatsapp) {
      toast.error("Nombre y WhatsApp son requeridos");
      return;
    }

    const dataToSave = {
      ...formData,
      numeroTelefono: formData.numeroTelefono || formData.whatsapp
    };

    if (selectedContacto) {
      updateMutation.mutate({ id: selectedContacto.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const getConsultasCount = (contactoId) => {
    return consultas.filter(c => c.contactoId === contactoId).length;
  };

  const getConcretadosCount = (contactoId) => {
    return consultas.filter(c => c.contactoId === contactoId && c.etapa === "Concretado").length;
  };

  const contactosFiltrados = contactos.filter(c => {
    if (search) {
      const s = search.toLowerCase();
      if (!c.nombre?.toLowerCase().includes(s) &&
          !c.empresa?.toLowerCase().includes(s) &&
          !c.whatsapp?.includes(search) &&
          !c.ciudad?.toLowerCase().includes(s)) {
        return false;
      }
    }
    if (filtroCanal !== "todos" && c.canalOrigen !== filtroCanal) return false;
    return true;
  });

  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    let clean = phone.replace(/\D/g, "");
    if (!clean.startsWith("54")) {
      clean = "54" + clean;
    }
    return clean;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Contactos</h1>
            <p className="text-slate-500">{contactosFiltrados.length} contactos</p>
          </div>
          {currentUser?.canEditContacts && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo contacto
            </Button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, teléfono o ciudad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroCanal} onValueChange={setFiltroCanal}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los canales</SelectItem>
              {CANALES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabla */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Contacto</TableHead>
                <TableHead className="font-semibold">WhatsApp</TableHead>
                <TableHead className="font-semibold">Ciudad</TableHead>
                <TableHead className="font-semibold">Canal</TableHead>
                <TableHead className="font-semibold">Consultas</TableHead>
                <TableHead className="font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactosFiltrados.map(contacto => (
                <TableRow key={contacto.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{contacto.nombre} {contacto.apellido}</p>
                        {contacto.empresa && contacto.empresa !== contacto.nombre && (
                          <p className="text-xs text-slate-500">{contacto.empresa}</p>
                        )}
                        {contacto.segmento && (
                          <Badge variant="secondary" className="text-xs mt-1">{contacto.segmento}</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {contacto.whatsapp}
                    </div>
                  </TableCell>
                  <TableCell>
                    {contacto.ciudad ? (
                      <div className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3 h-3" />
                        {contacto.ciudad}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contacto.canalOrigen ? (
                      <Badge variant="secondary">{contacto.canalOrigen}</Badge>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getConsultasCount(contacto.id)}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-emerald-600">{getConcretadosCount(contacto.id)} ✓</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {currentUser?.canEditContacts && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedContacto(contacto);
                            setShowDetalleDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-[#25D366] border-[#25D366] hover:bg-[#25D366] hover:text-white"
                        onClick={() => {
                          setSelectedContacto(contacto);
                          setShowListasDialog(true);
                        }}
                      >
                        <ListCheck className="w-4 h-4 mr-1" />
                        Lista
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#25D366] hover:bg-[#20bd5a] text-white h-8 w-8 p-0"
                        onClick={() => {
                          const phone = formatPhoneNumber(contacto.whatsapp);
                          window.open(`https://wa.me/${phone}`, "_blank");
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      {currentUser?.canEditContacts && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          onClick={() => {
                            if (window.confirm("¿Estás seguro de eliminar este contacto?")) {
                              deleteMutation.mutate(contacto.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {contactosFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    No hay contactos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); else setShowForm(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedContacto ? "Editar contacto" : "Nuevo contacto"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Juan"
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  placeholder="Pérez"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <Input
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="+54 9 11 1234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                placeholder="Buenos Aires"
              />
            </div>
            <div className="space-y-2">
              <Label>Canal de origen</Label>
              <Select 
                value={formData.canalOrigen} 
                onValueChange={(val) => setFormData({ ...formData, canalOrigen: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {CANALES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSubmit}>
              {selectedContacto ? "Guardar cambios" : "Crear contacto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DetalleContactoDialog
        contacto={selectedContacto}
        open={showDetalleDialog}
        onOpenChange={setShowDetalleDialog}
      />

      <DialogSelectorListasWhatsApp
        open={showListasDialog}
        onOpenChange={setShowListasDialog}
        contactoId={selectedContacto?.id}
        contactoWhatsapp={selectedContacto?.whatsapp}
        onMessageSent={refetch}
      />
    </div>
  );
}
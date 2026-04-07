import { useState } from "react";
import { crm } from "@/api/crmClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

export default function ListasWhatsApp() {
  const { data: currentUser } = useCurrentUser();
  const { workspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("all");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [proveedorFilter, setProveedorFilter] = useState("all");

  const { data: listas = [], refetch } = useQuery({
    queryKey: ['listas-whatsapp', workspace?.id],
    queryFn: () => workspace ? crm.entities.ListaWhatsApp.filter({ workspace_id: workspace.id }, "-updated_date", 1000) : [],
    enabled: !!workspace
  });

  const deleteMutation = {
    mutate: async (id) => {
      await crm.entities.ListaWhatsApp.delete(id);
      toast.success("Lista eliminada");
      refetch();
    }
  };

  const filteredListas = listas.filter(lista => {
    const matchSearch = search === "" || 
      lista.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (lista.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase())));
    const matchCategoria = categoriaFilter === "all" || lista.categoria === categoriaFilter;
    const matchEstado = estadoFilter === "all" || lista.estado === estadoFilter;
    const matchProveedor = proveedorFilter === "all" || lista.proveedor === proveedorFilter;
    
    return matchSearch && matchCategoria && matchEstado && matchProveedor;
  });

  const categorias = [...new Set(listas.map(l => l.categoria))];
  const estados = ["Borrador", "Publicada", "Archivada"];
  const proveedores = [...new Set(listas.filter(l => l.proveedor).map(l => l.proveedor))];

  const estadoColors = {
    "Borrador": "bg-slate-100 text-slate-800",
    "Publicada": "bg-green-100 text-green-800",
    "Archivada": "bg-gray-100 text-gray-800"
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Listas WhatsApp</h1>
            <p className="text-slate-500 mt-1">Gestiona tus listas predefinidas para enviar</p>
          </div>
          {currentUser?.role === "admin" && (
            <Link to={createPageUrl("EditorListaWhatsApp?new=true")}>
              <Button className="gap-2 bg-slate-900 hover:bg-slate-800">
                <Plus className="w-5 h-5" />
                Nueva Lista
              </Button>
            </Link>
          )}
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Input
                placeholder="Buscar por nombre o tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categorias.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {estados.map(est => (
                    <SelectItem key={est} value={est}>{est}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={proveedorFilter} onValueChange={setProveedorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  {proveedores.map(prov => (
                    <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Nombre</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Categoría</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Proveedor</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Estado</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Actualizado</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListas.map(lista => (
                    <tr key={lista.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{lista.nombre}</td>
                      <td className="py-3 px-4 text-slate-600">{lista.categoria}</td>
                      <td className="py-3 px-4 text-slate-600">{lista.proveedor || "-"}</td>
                      <td className="py-3 px-4">
                        <Badge className={estadoColors[lista.estado]}>
                          {lista.estado}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {moment(lista.updated_date).format("DD/MM/YYYY HH:mm")}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link to={createPageUrl(`EditorListaWhatsApp?id=${lista.id}`)}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        {currentUser?.role === "admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => deleteMutation.mutate(lista.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredListas.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No hay listas que coincidan con los filtros
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import {
  guardarConsultaConItems,
  obtenerConsultaConItems,
  calcularTotalesItems,
} from "@/utils/consultaItems";

export default function ConsultaFormConItems({
  consultaId,
  workspace_id,
  onSave,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    nroppto: "",
    contactonombre: "",
    contactowhatsapp: "",
    asesor: "",
    empresa: "EMAT Celulosa",
    superficiem2: "",
    observaciones: "",
    condicionescomerciales: "",
    iva: 21,
    diasvalidez: 30,
  });

  const [items, setItems] = useState([
    { descripcion: "", preciounitario: "", cantidad: "", importe: "" },
  ]);

  const [loading, setLoading] = useState(false);

  // Cargar consulta si existe
  useEffect(() => {
    if (consultaId) {
      cargarConsulta();
    }
  }, [consultaId]);

  const cargarConsulta = async () => {
    try {
      setLoading(true);
      const consulta = await obtenerConsultaConItems(consultaId);
      setFormData(consulta);
      setItems(
        consulta.items && consulta.items.length > 0
          ? consulta.items
          : [{ descripcion: "", preciounitario: "", cantidad: "", importe: "" }]
      );
    } catch (error) {
      toast.error("Error al cargar presupuesto");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar campo del formulario
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Actualizar item
  const handleItemChange = (index, field, value) => {
    const nuevosItems = [...items];
    nuevosItems[index][field] = value;

    // Calcular importe automáticamente
    if (field === "preciounitario" || field === "cantidad") {
      const precio = Number(nuevosItems[index].preciounitario) || 0;
      const cantidad = Number(nuevosItems[index].cantidad) || 0;
      nuevosItems[index].importe = (precio * cantidad).toString();
    }

    setItems(nuevosItems);
  };

  // Agregar nuevo item
  const agregarItem = () => {
    setItems([
      ...items,
      { descripcion: "", preciounitario: "", cantidad: "", importe: "" },
    ]);
  };

  // Eliminar item
  const eliminarItem = (index) => {
    if (items.length === 1) {
      toast.error("Debe haber al menos un item");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Calcular totales
  const { subtotal, ivaValue, total } = calcularTotalesItems(
    items,
    Number(formData.iva) || 21
  );

  // Guardar
  const handleSave = async () => {
    try {
      // Validaciones
      if (!formData.nroppto?.trim()) {
        toast.error("Número de presupuesto requerido");
        return;
      }
      if (!formData.contactonombre?.trim()) {
        toast.error("Nombre de cliente requerido");
        return;
      }
      if (
        items.length === 0 ||
        !items[0].descripcion?.trim()
      ) {
        toast.error("Al menos un item requerido");
        return;
      }

      // Validar que todos los items tengan datos
      for (let i = 0; i < items.length; i++) {
        if (!items[i].descripcion?.trim()) {
          toast.error(`Item ${i + 1}: Descripción requerida`);
          return;
        }
        if (!items[i].preciounitario) {
          toast.error(`Item ${i + 1}: Precio unitario requerido`);
          return;
        }
        if (!items[i].cantidad) {
          toast.error(`Item ${i + 1}: Cantidad requerida`);
          return;
        }
      }

      setLoading(true);

      // Guardar
      await guardarConsultaConItems(formData, items, workspace_id);
      toast.success("Presupuesto guardado correctamente");
      onSave?.();
    } catch (error) {
      toast.error("Error al guardar presupuesto");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && consultaId) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Cargando presupuesto...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <Card>
        <CardHeader>
          <CardTitle>
            {consultaId ? "Editar Presupuesto" : "Nuevo Presupuesto"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Datos principales */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "16px", fontWeight: "bold" }}>
              Información del cliente
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1rem",
              }}
            >
              <div>
                <Label>
                  Número de presupuesto <span style={{ color: "#ef4444" }}>*</span>
                </Label>
                <Input
                  name="nroppto"
                  value={formData.nroppto}
                  onChange={handleFormChange}
                  placeholder="Ej: 001"
                />
              </div>
              <div>
                <Label>
                  Cliente <span style={{ color: "#ef4444" }}>*</span>
                </Label>
                <Input
                  name="contactonombre"
                  value={formData.contactonombre}
                  onChange={handleFormChange}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <Label>Teléfono/WhatsApp</Label>
                <Input
                  name="contactowhatsapp"
                  value={formData.contactowhatsapp}
                  onChange={handleFormChange}
                  placeholder="+54 9 351 123-4567"
                />
              </div>
              <div>
                <Label>Asesor</Label>
                <Input
                  name="asesor"
                  value={formData.asesor}
                  onChange={handleFormChange}
                  placeholder="Nombre del asesor"
                />
              </div>
              <div>
                <Label>Superficie (m²)</Label>
                <Input
                  name="superficiem2"
                  type="number"
                  value={formData.superficiem2}
                  onChange={handleFormChange}
                  placeholder="1200"
                />
              </div>
              <div>
                <Label>% IVA</Label>
                <Input
                  name="iva"
                  type="number"
                  value={formData.iva}
                  onChange={handleFormChange}
                  placeholder="21"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "16px", fontWeight: "bold" }}>
              Detalles del servicio
            </h3>

            <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f0f0f0", borderBottom: "2px solid #ddd" }}>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                      }}
                    >
                      Descripción
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "right",
                        fontWeight: "bold",
                        width: "120px",
                      }}
                    >
                      Precio unitario
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "center",
                        fontWeight: "bold",
                        width: "100px",
                      }}
                    >
                      Cantidad
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "right",
                        fontWeight: "bold",
                        width: "120px",
                      }}
                    >
                      Importe
                    </th>
                    <th style={{ padding: "0.75rem", width: "50px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <td style={{ padding: "0.75rem" }}>
                        <Input
                          value={item.descripcion}
                          onChange={(e) =>
                            handleItemChange(index, "descripcion", e.target.value)
                          }
                          placeholder="Descripción del servicio"
                          style={{ width: "100%", fontSize: "14px" }}
                        />
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <Input
                          type="number"
                          value={item.preciounitario}
                          onChange={(e) =>
                            handleItemChange(index, "preciounitario", e.target.value)
                          }
                          placeholder="Precio"
                          style={{ textAlign: "right", fontSize: "14px" }}
                        />
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "center" }}>
                        <Input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) =>
                            handleItemChange(index, "cantidad", e.target.value)
                          }
                          placeholder="0"
                          style={{ textAlign: "center", fontSize: "14px" }}
                        />
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "right" }}>
                        <Input
                          type="number"
                          value={item.importe}
                          disabled
                          placeholder="0"
                          style={{
                            textAlign: "right",
                            fontSize: "14px",
                            background: "#f5f5f5",
                          }}
                        />
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "center" }}>
                        {items.length > 1 && (
                          <button
                            onClick={() => eliminarItem(index)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#ef4444",
                              padding: "0.5rem",
                            }}
                            title="Eliminar item"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              variant="outline"
              onClick={agregarItem}
              className="gap-2"
              style={{ marginBottom: "1rem" }}
            >
              <Plus size={16} />
              Agregar item
            </Button>
          </div>

          {/* Totales */}
          <div
            style={{
              background: "#f9f9f9",
              padding: "1.5rem",
              borderRadius: "8px",
              marginBottom: "2rem",
              border: "1px solid #eee",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "3rem",
                maxWidth: "500px",
                marginLeft: "auto",
              }}
            >
              <div>
                <div style={{ color: "#666", fontSize: "13px", marginBottom: "0.25rem" }}>
                  Sub-total:
                </div>
                <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                  ${subtotal.toLocaleString("es-AR")}
                </div>
              </div>
              <div>
                <div style={{ color: "#666", fontSize: "13px", marginBottom: "0.25rem" }}>
                  IVA {formData.iva}%:
                </div>
                <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                  ${ivaValue.toLocaleString("es-AR")}
                </div>
              </div>
              <div>
                <div style={{ color: "#666", fontSize: "13px", marginBottom: "0.25rem" }}>
                  Total:
                </div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1e4250" }}>
                  ${total.toLocaleString("es-AR")}
                </div>
              </div>
            </div>
          </div>

          {/* Observaciones y condiciones */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "16px", fontWeight: "bold" }}>
              Notas y condiciones
            </h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <Label>Observaciones</Label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleFormChange}
                  placeholder="Notas adicionales"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    minHeight: "80px",
                    fontFamily: "inherit",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div>
                <Label>Condiciones comerciales</Label>
                <textarea
                  name="condicionescomerciales"
                  value={formData.condicionescomerciales}
                  onChange={handleFormChange}
                  placeholder="Términos y condiciones"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    minHeight: "80px",
                    fontFamily: "inherit",
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Guardando..." : "Guardar presupuesto"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

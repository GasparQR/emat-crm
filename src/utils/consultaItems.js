/**
 * utils/consultaItems.js
 * 
 * Funciones para guardar, recuperar y procesar consultas con múltiples items
 * Integración con Supabase
 */

import { entities } from "@/api/supabaseClient";
import { applyFechaGanadoOnStageChange, getFechaGanadoFromConsulta } from "@/lib/pipelineStage";
import { parseIvaPercent } from "@/lib/consultaIva";
import { parseConsultaItems } from "@/utils/parseConsultaItems";

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).replace(",", ".").trim();
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function itemImporteNum(item) {
  const direct = Number(item?.importe);
  if (Number.isFinite(direct)) return direct;
  const precio = Number(item?.preciounitario ?? item?.precioUnitario);
  const cantidad = Number(item?.cantidad);
  if (Number.isFinite(precio) && Number.isFinite(cantidad)) {
    return precio * cantidad;
  }
  return 0;
}

/**
 * Totales desnormalizados para columnas consulta (subtotal, iva_value, total_importe).
 *
 * @param {Array} items
 * @param {number} ivaPercent - Porcentaje de IVA (ej. 21)
 * @returns {{ subtotal: number, iva_value: number, total_importe: number }}
 */
export function calcularTotalesConsulta(items = [], ivaPercent = 21) {
  const subtotal = items.reduce((sum, item) => sum + itemImporteNum(item), 0);
  const iva = parseIvaPercent(ivaPercent, 21);
  const iva_value = (subtotal * iva) / 100;
  const total_importe = subtotal + iva_value;
  const round2 = (n) => Math.round(n * 100) / 100;
  return {
    subtotal: round2(subtotal),
    iva_value: round2(iva_value),
    total_importe: round2(total_importe),
  };
}

/**
 * Recalcula importes de líneas y totales con IVA.
 *
 * @returns {{ nextItems, subtotal, ivaValue, totalImporte, totalText }}
 */
export function computeItemsAndTotal(items = [], ivaPercent = 21) {
  const nextItems = items.map((item) => {
    const precio = toNumberOrNull(item.precioUnitario);
    const cantidad = toNumberOrNull(item.cantidad);
    const importeNum = precio !== null && cantidad !== null ? precio * cantidad : null;
    return {
      ...item,
      importe: importeNum !== null ? importeNum.toFixed(2) : "",
    };
  });

  const { subtotal, iva_value, total_importe } = calcularTotalesConsulta(nextItems, ivaPercent);
  return {
    nextItems,
    subtotal,
    ivaValue: iva_value,
    totalImporte: total_importe,
    totalText: total_importe > 0 ? total_importe.toFixed(2) : "",
  };
}

/**
 * Guardar una consulta con múltiples items
 * Calcula automáticamente subtotal, IVA y total
 * 
 * @param {Object} consulta - Datos principales de la consulta
 * @param {Array} items - Array de items con {descripcion, preciounitario, cantidad, importe}
 * @param {string} workspace_id - ID del workspace
 * @returns {Promise<Object>} - Consulta guardada
 */
export const guardarConsultaConItems = async (consulta, items, workspace_id) => {
  try {
    // Validar items
    if (!items || items.length === 0) {
      throw new Error("Se requiere al menos un item");
    }

    const iva = parseIvaPercent(consulta.iva, 21);
    const { subtotal, iva_value: ivaValue, total_importe: totalImporte } =
      calcularTotalesConsulta(items, iva);

    // 2. Preparar datos para guardar
    const dataToSave = {
      nroppto: consulta.nroppto,
      contactonombre: consulta.contactonombre,
      contactowhatsapp: consulta.contactowhatsapp || "",
      asesor: consulta.asesor || "",
      empresa: consulta.empresa || "EMAT Celulosa",
      superficiem2: consulta.superficiem2 || 0,
      observaciones: consulta.observaciones || "",
      condicionescomerciales: consulta.condicionescomerciales || "",
      iva,
      diasvalidez: Number(consulta.diasvalidez) || 30,
      fechapresupuesto: consulta.fechapresupuesto || new Date().toISOString().split("T")[0],

      // JSON con items completos
      items: JSON.stringify(items),

      // Desnormalización de totales para reportes rápidos
      subtotal,
      iva_value: ivaValue,
      total_importe: totalImporte,

      // Otros campos
      pipeline_stage: consulta.pipeline_stage || "NUEVO LEAD",
      workspace_id: workspace_id || consulta.workspace_id,
    };

    const existingFecha = getFechaGanadoFromConsulta(consulta);
    if (existingFecha) {
      dataToSave.fecha_ganado = existingFecha;
    } else if (!consulta.id) {
      const fechaPatch = applyFechaGanadoOnStageChange({
        previousStage: null,
        nextStage: dataToSave.pipeline_stage,
        currentFechaGanado: null,
        patch: {},
      });
      if (fechaPatch.fecha_ganado) {
        dataToSave.fecha_ganado = fechaPatch.fecha_ganado;
      }
    }

    // 3. Guardar o actualizar
    let resultado;
    if (consulta.id) {
      // Actualizar existente
      resultado = await entities.Consulta.update(consulta.id, dataToSave);
    } else {
      // Crear nuevo
      resultado = await entities.Consulta.create(dataToSave);
    }

    return resultado;
  } catch (error) {
    console.error("Error al guardar consulta con items:", error);
    throw error;
  }
};

/**
 * Obtener una consulta y parsear sus items
 * 
 * @param {string} consultaId - ID de la consulta
 * @returns {Promise<Object>} - Consulta con items parseados
 */
export const obtenerConsultaConItems = async (consultaId) => {
  try {
    const consulta = await entities.Consulta.read(consultaId);

    if (!consulta) {
      throw new Error("Consulta no encontrada");
    }

    consulta.items = parseConsultaItems(consulta.items);

    return consulta;
  } catch (error) {
    console.error("Error al obtener consulta con items:", error);
    throw error;
  }
};

/**
 * Obtener todas las consultas de un workspace con items parseados
 * 
 * @param {string} workspace_id - ID del workspace
 * @param {string} orderBy - Campo para ordenar (default: "-created_date")
 * @param {number} limit - Límite de resultados (default: 500)
 * @returns {Promise<Array>} - Array de consultas con items parseados
 */
export const obtenerConsultasConItems = async (
  workspace_id,
  orderBy = "-created_date",
  limit = 500
) => {
  try {
    const consultas = await entities.Consulta.filter(
      { workspace_id },
      orderBy,
      limit
    );

    return consultas.map((consulta) => ({
      ...consulta,
      items: parseConsultaItems(consulta.items),
    }));
  } catch (error) {
    console.error("Error al obtener consultas con items:", error);
    throw error;
  }
};

/**
 * Calcular totales de una consulta basado en sus items
 *
 * @param {Array} items - Array de items
 * @param {number} iva - Porcentaje de IVA
 * @returns {Object} - {subtotal, ivaValue, total}
 */
export const calcularTotalesItems = (items = [], iva = 21) => {
  const { subtotal, iva_value, total_importe } = calcularTotalesConsulta(items, iva);
  return {
    subtotal,
    ivaValue: iva_value,
    total: total_importe,
  };
};

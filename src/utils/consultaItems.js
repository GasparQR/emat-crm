/**
 * utils/consultaItems.js
 * 
 * Funciones para guardar, recuperar y procesar consultas con múltiples items
 * Integración con Supabase
 */

import { entities } from "@/api/supabaseClient";

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

    // 1. Calcular totales
    const subtotal = items.reduce((sum, item) => {
      return sum + (Number(item.importe) || 0);
    }, 0);

    const iva = Number(consulta.iva) || 21;
    const ivaValue = (subtotal * iva) / 100;
    const totalImporte = subtotal + ivaValue;

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

    // Parsear items si vienen como string JSON
    if (typeof consulta.items === "string") {
      try {
        consulta.items = JSON.parse(consulta.items);
      } catch (e) {
        console.warn("No se pudo parsear items, usando array vacío", e);
        consulta.items = [];
      }
    }

    // Si no hay items, crear array vacío
    if (!consulta.items) {
      consulta.items = [];
    }

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

    // Parsear items en cada consulta
    return consultas.map((consulta) => ({
      ...consulta,
      items: typeof consulta.items === "string"
        ? JSON.parse(consulta.items || "[]")
        : consulta.items || [],
    }));
  } catch (error) {
    console.error("Error al obtener consultas con items:", error);
    throw error;
  }
};

/**
 * Filtrar consultas por criterios específicos
 * 
 * @param {string} workspace_id - ID del workspace
 * @param {Object} filters - Objeto con filtros {asesor, pipeline_stage, etc}
 * @returns {Promise<Array>} - Consultas filtradas
 */
export const filtrarConsultasConItems = async (workspace_id, filters = {}) => {
  try {
    const queryFilters = { workspace_id, ...filters };
    const consultas = await entities.Consulta.filter(queryFilters, "-created_date", 500);

    // Parsear items
    return consultas.map((consulta) => ({
      ...consulta,
      items: typeof consulta.items === "string"
        ? JSON.parse(consulta.items || "[]")
        : consulta.items || [],
    }));
  } catch (error) {
    console.error("Error al filtrar consultas:", error);
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
  const subtotal = items.reduce((sum, item) => {
    return sum + (Number(item.importe) || 0);
  }, 0);

  const ivaValue = (subtotal * iva) / 100;
  const total = subtotal + ivaValue;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    ivaValue: Math.round(ivaValue * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
};

/**
 * Migrar datos antiguos (sin items) a nuevo formato
 * Ejecutar una sola vez para actualizar presupuestos existentes
 * 
 * @param {string} workspace_id - ID del workspace
 * @returns {Promise<Object>} - {migradas: number, errores: number}
 */
export const migrarDatosAntiguo = async (workspace_id) => {
  try {
    const consultas = await entities.Consulta.filter(
      { workspace_id },
      null,
      1000
    );

    let migradas = 0;
    let errores = 0;

    for (const consulta of consultas) {
      try {
        // Si no tiene items pero tiene descripcionservicio
        if (!consulta.items && consulta.descripcionservicio) {
          const newItems = [
            {
              descripcion: consulta.descripcionservicio,
              preciounitario: Number(consulta.preciounitario) || 0,
              cantidad: Number(consulta.cantidad) || 1,
              importe: Number(consulta.importe) || 0,
            },
          ];

          const subtotal = Number(consulta.importe) || 0;
          const ivaValue = (subtotal * (Number(consulta.iva) || 21)) / 100;
          const totalImporte = subtotal + ivaValue;

          await entities.Consulta.update(consulta.id, {
            items: JSON.stringify(newItems),
            subtotal,
            iva_value: ivaValue,
            total_importe: totalImporte,
          });

          console.log(`✅ Migrado: ${consulta.nroppto}`);
          migradas++;
        }
      } catch (itemError) {
        console.error(`❌ Error migrando ${consulta.nroppto}:`, itemError);
        errores++;
      }
    }

    console.log(`Migración completada: ${migradas} actualizadas, ${errores} errores`);
    return { migradas, errores };
  } catch (error) {
    console.error("Error en migración:", error);
    throw error;
  }
};

/**
 * Obtener resumen de totales por asesor (usa campos desnormalizados)
 * 
 * @param {string} workspace_id - ID del workspace
 * @returns {Promise<Array>} - Array con resumen por asesor
 */
export const obtenerResumenPorAsesor = async (workspace_id) => {
  try {
    const consultas = await obtenerConsultasConItems(workspace_id, null, 1000);

    // Agrupar por asesor
    const resumen = {};
    consultas.forEach((c) => {
      if (!resumen[c.asesor]) {
        resumen[c.asesor] = {
          asesor: c.asesor || "Sin asignar",
          cantidad: 0,
          subtotal: 0,
          iva: 0,
          total: 0,
        };
      }
      resumen[c.asesor].cantidad++;
      resumen[c.asesor].subtotal += c.subtotal || 0;
      resumen[c.asesor].iva += c.iva_value || 0;
      resumen[c.asesor].total += c.total_importe || 0;
    });

    return Object.values(resumen);
  } catch (error) {
    console.error("Error al obtener resumen por asesor:", error);
    throw error;
  }
};

/**
 * Obtener resumen de totales por estado de pipeline (usa campos desnormalizados)
 * 
 * @param {string} workspace_id - ID del workspace
 * @returns {Promise<Array>} - Array con resumen por estado
 */
export const obtenerResumenPorEstado = async (workspace_id) => {
  try {
    const consultas = await obtenerConsultasConItems(workspace_id, null, 1000);

    // Agrupar por estado
    const resumen = {};
    consultas.forEach((c) => {
      const estado = c.pipeline_stage || "Sin estado";
      if (!resumen[estado]) {
        resumen[estado] = {
          estado,
          cantidad: 0,
          total: 0,
        };
      }
      resumen[estado].cantidad++;
      resumen[estado].total += c.total_importe || 0;
    });

    return Object.values(resumen);
  } catch (error) {
    console.error("Error al obtener resumen por estado:", error);
    throw error;
  }
};

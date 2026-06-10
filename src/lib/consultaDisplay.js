export const TIPO_APLICACION_BOLSA = "Bolsa";

function positiveNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @param {Record<string, unknown>} consulta
 * @returns {{ kind: "m2" | "kg", value: number } | null}
 */
export function getConsultaCantidadDisplay(consulta) {
  const m2 = positiveNumber(consulta?.superficiem2 ?? consulta?.superficieM2);
  if (m2 != null) {
    return { kind: "m2", value: m2 };
  }

  const tipo = consulta?.tipoaplicacion ?? consulta?.tipoAplicacion ?? "";
  const kg = positiveNumber(consulta?.fibrakg ?? consulta?.fibraKg);
  if (tipo === TIPO_APLICACION_BOLSA && kg != null) {
    return { kind: "kg", value: kg };
  }

  return null;
}

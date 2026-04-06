// Utilidades de normalización para importación de ventas

export function normalizeDate(dateInput) {
  if (dateInput === null || dateInput === undefined || String(dateInput).trim() === "") {
    return { value: null, error: "Fecha vacía" };
  }

  // Si viene como Date real (algunos parsers de XLSX lo devuelven así)
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return { value: dateInput.toISOString().split("T")[0], error: null };
  }

  let str = String(dateInput).trim();

  // --- Caso 1: serial de Excel (entero típico 1..60000) ---
  // Acepta "45278", "45278.0", 45278
  const maybeNum = Number(str);
  const isExcelSerial = Number.isFinite(maybeNum) && maybeNum > 0 && maybeNum < 60000;

  if (isExcelSerial && Number.isInteger(maybeNum)) {
    // Excel epoch (1900 system)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 1899-12-30
    let days = maybeNum;

    // Ajuste bug Excel 1900 leap year
    if (days >= 60) days -= 1;

    const date = new Date(excelEpoch.getTime() + days * 86400 * 1000);
    if (!isNaN(date.getTime()) && date.getUTCFullYear() >= 1900 && date.getUTCFullYear() < 2100) {
      return { value: date.toISOString().split("T")[0], error: null };
    }
    return { value: str, error: "Número de serie de Excel inválido" };
  }

  // --- Caso 2: ISO Date (YYYY-MM-DD) ---
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    // Validación real (evita 2023-99-99)
    const d = new Date(str + "T00:00:00Z");
    if (!isNaN(d.getTime())) return { value: str, error: null };
  }

  // --- Caso 3: ISO DateTime (YYYY-MM-DDTHH:mm:ss...) ---
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return { value: d.toISOString().split("T")[0], error: null };
  }

  // --- Caso 4: DD/MM/YYYY o DD-MM-YYYY (Argentina) ---
  const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = m[3];

    const iso = `${year}-${month}-${day}`;
    const d = new Date(iso + "T00:00:00Z");
    if (!isNaN(d.getTime())) {
      const warning =
        Number(day) <= 12 && Number(month) <= 12
          ? "Formato ambiguo (asumido DD/MM/YYYY)"
          : null;
      return { value: iso, error: null, warning };
    }
  }

  return { value: str, error: "Formato de fecha inválido" };
}

export function normalizeNumber(numInput) {
  if (numInput === null || numInput === undefined || String(numInput).trim() === "") {
    return { value: 0, error: null };
  }

  let str = String(numInput).trim();

  // Limpiar símbolos comunes sin romper "USDT"
  // Saca: US$, USD, $, €, espacios
  str = str.replace(/US\$/gi, "")
           .replace(/\bUSD\b/gi, "")
           .replace(/[$€\s]/g, "");

  const hasComma = str.includes(",");
  const hasDot = str.includes(".");

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");
    if (lastComma > lastDot) {
      // 1.400,50
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,400.50
      str = str.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = str.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      // 1400,50
      str = str.replace(",", ".");
    } else {
      // 1,400
      str = str.replace(/,/g, "");
    }
  }

  const num = Number(str);
  if (!Number.isFinite(num)) return { value: 0, error: "No es un número válido" };

  return { value: num, error: null };
}

export function normalizeMarketplace(marketString) {
  if (!marketString) return { value: "Otro", error: null };

  const raw = String(marketString).toLowerCase().trim();
  const compact = raw.replace(/\s+/g, ""); // sin espacios

  const mapping = {
    ml: "MercadoLibre",
    mercadolibre: "MercadoLibre",
    ig: "Instagram",
    instagram: "Instagram",
    wa: "WhatsApp",
    whatsapp: "WhatsApp",
    local: "Local",
    tienda: "Local",
  };

  return { value: mapping[compact] || "Otro", error: null };
}

export function normalizeProveedor(proveedorString) {
  if (!proveedorString) return { value: "", error: null };
  const str = String(proveedorString).trim().replace(/\s\s+/g, " ");
  return { value: str, error: null };
}

export function extractProductDetails(modeloString, capacidadString, colorString) {
  let modelo = String(modeloString || "").trim();
  let capacidad = String(capacidadString || "").trim();
  let color = String(colorString || "").trim();

  if (capacidad && color) return { modelo, capacidad, color, error: null };

  // Capacidad desde modelo (64GB, 1TB, etc)
  if (!capacidad && modelo) {
    const cap = modelo.match(/\b(\d+)\s?(GB|TB)\b/i);
    if (cap) {
      capacidad = cap[1] + cap[2].toUpperCase();
      modelo = modelo.replace(cap[0], "").trim();
    }
  }

  // Colores conocidos
  if (!color && modelo) {
    const colores = [
      "Negro","Blanco","Azul","Rojo","Verde","Amarillo","Rosa","Morado","Gris","Oro","Plata","Titanio",
      "Grafito","Midnight","Starlight","Purple","Blue","Black","White","Red","Green","Pink","Gold","Silver",
      "Natural","Desert","Alpine"
    ];
    for (const c of colores) {
      const re = new RegExp(`\\b${c}\\b`, "i");
      if (re.test(modelo)) {
        color = c;
        modelo = modelo.replace(re, "").trim();
        break;
      }
    }
  }

  modelo = modelo.replace(/\s\s+/g, " ").trim();
  return { modelo, capacidad, color, error: null };
}

export function calculateGanancia(venta, costo, comision, canje = 0) {
  const v = Number.isFinite(venta) ? venta : 0;
  const c = Number.isFinite(costo) ? costo : 0;
  const com = Number.isFinite(comision) ? comision : 0;
  const can = Number.isFinite(canje) ? canje : 0;
  return v - c - com + can;
}

export function validateGanancia(gananciaImportada, gananciaCalculada, umbral = 0.01) {
  const gi = Number(gananciaImportada);
  const diff = Math.abs(gi - gananciaCalculada);
  if (diff > umbral) {
    return {
      valid: false,
      warning: `Ganancia importada (${gi}) difiere de la calculada (${gananciaCalculada.toFixed(2)})`
    };
  }
  return { valid: true, warning: null };
}

export function normalizeCodigo(codigoString) {
  if (!codigoString || String(codigoString).trim() === "") {
    return { value: null, error: "El código no puede estar vacío" };
  }
  const str = String(codigoString).trim().toUpperCase();
  return { value: str, error: null };
}

export function normalizeRow(row, columnMapping) {
  const normalized = {};
  const errors = [];
  const warnings = [];

  for (const [fileColumn, ventaField] of Object.entries(columnMapping)) {
    if (ventaField === "ignore" || !ventaField) continue;
    const value = row[fileColumn];

    switch (ventaField) {
      case "fecha": {
        const r = normalizeDate(value);
        normalized.fecha = r.value;
        if (r.error) errors.push(`Fecha: ${r.error}`);
        if (r.warning) warnings.push(r.warning);
        break;
      }

      case "codigo": {
        const r = normalizeCodigo(value);
        normalized.codigo = r.value;
        if (r.error) errors.push(`Código: ${r.error}`);
        break;
      }

      case "costo":
      case "comision":
      case "venta":
      case "ganancia":
      case "canje": {
        const r = normalizeNumber(value);
        normalized[ventaField] = r.value;
        if (r.error) errors.push(`${ventaField}: ${r.error}`);
        break;
      }

      case "marketplace": {
        const r = normalizeMarketplace(value);
        normalized.marketplace = r.value;
        break;
      }

      case "proveedorTexto": {
        const r = normalizeProveedor(value);
        normalized.proveedorTexto = r.value;
        break;
      }

      default:
        normalized[ventaField] = value;
    }
  }

  // Producto
  const p = extractProductDetails(normalized.modelo, normalized.capacidad, normalized.color);
  normalized.modelo = p.modelo;
  normalized.capacidad = p.capacidad;
  normalized.color = p.color;

  // Ganancia: recalcular si falta o si el importador te lo pide (acá recalcula si vino vacío)
  const gananciaVino = row?.GANANCIA ?? row?.ganancia ?? null;
  const gananciaEsCeroReal = normalized.ganancia === 0 && String(gananciaVino).trim() === "0";

  if (gananciaVino === null || gananciaVino === undefined || String(gananciaVino).trim() === "") {
    normalized.ganancia = calculateGanancia(normalized.venta, normalized.costo, normalized.comision, normalized.canje);
  } else if (!gananciaEsCeroReal) {
    const calc = calculateGanancia(normalized.venta, normalized.costo, normalized.comision, normalized.canje);
    const v = validateGanancia(normalized.ganancia, calc, 1);
    if (!v.valid) warnings.push(v.warning);
  }

  return {
    ...normalized,
    _errors: errors,
    _warnings: warnings,
    _hasErrors: errors.length > 0
  };
}

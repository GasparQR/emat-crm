import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mapa: nombre sucio -> { nombre canónico, proveedorId }
    const nameMap = {
      "GON CETSELL":      { nombre: "CELLSAT",    id: "6968c0edeb7edf8d57cae8aa" },
      "EMI IMPO":         { nombre: "IMPO CBA",   id: "6968c0973e7148628ebb23d4" },
      "EMI":              { nombre: "IMPO CBA",   id: "6968c0973e7148628ebb23d4" },
      "IMPO CBA":         { nombre: "IMPO CBA",   id: "6968c0973e7148628ebb23d4" },
      "MATI":             { nombre: "MATI NEXUS", id: "699847fe9b38acaf878e34ec" },
      "MATI NEXUS":       { nombre: "MATI NEXUS", id: "699847fe9b38acaf878e34ec" },
      "MARTIN MB":        { nombre: "MB CELUS",   id: "6968c19b33dc2a668f64cbc9" },
      "MARTÍN MB":        { nombre: "MB CELUS",   id: "6968c19b33dc2a668f64cbc9" },
      "MARTIN MB CELUS":  { nombre: "MB CELUS",   id: "6968c19b33dc2a668f64cbc9" },
      "MB CELUS":         { nombre: "MB CELUS",   id: "6968c19b33dc2a668f64cbc9" },
      "CELLSAT":          { nombre: "CELLSAT",    id: "6968c0edeb7edf8d57cae8aa" },
      "EDY":              { nombre: "EDY",        id: "6967aab50fb89d1c9af3bb2b" },
      "PLAN CANJE":       { nombre: "Plan Canje", id: null },
      "plan canje":       { nombre: "Plan Canje", id: null },
      "Plan canje":       { nombre: "Plan Canje", id: null },
    };

    const allVentas = await base44.asServiceRole.entities.Venta.list('-created_date', 500);

    // Detectar cuáles necesitan actualización de nombre o ID
    const toUpdate = [];
    for (const venta of allVentas) {
      const snap = (venta.proveedorNombreSnapshot || '').trim();
      const texto = (venta.proveedorTexto || '').trim();
      const mapped = nameMap[snap] || nameMap[texto];

      if (mapped) {
        const needsNameFix = snap !== mapped.nombre;
        const needsIdFix = !venta.proveedorId || venta.proveedorId !== mapped.id;
        if (needsNameFix || needsIdFix) {
          toUpdate.push({
            id: venta.id,
            codigo: venta.codigo,
            oldName: snap,
            newName: mapped.nombre,
            newProveedorId: mapped.id
          });
        }
      } else if (!snap && texto && !venta.proveedorId) {
        // No está en el mapa pero tiene texto: actualizar snapshot al menos
        toUpdate.push({
          id: venta.id,
          codigo: venta.codigo,
          oldName: '',
          newName: texto,
          newProveedorId: null
        });
      }
    }

    // Actualizar de a 5 con pausa entre lotes
    const updated = [];
    const BATCH = 3;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      for (const item of batch) {
        const patch = { proveedorNombreSnapshot: item.newName };
        if (item.newProveedorId) patch.proveedorId = item.newProveedorId;
        await base44.asServiceRole.entities.Venta.update(item.id, patch);
        await new Promise(r => setTimeout(r, 300));
      }
      updated.push(...batch);
      if (i + BATCH < toUpdate.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return Response.json({
      message: `Se actualizaron ${updated.length} ventas.`,
      details: updated
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const d = result.getDay();
    if (d !== 0 && d !== 6) added++;
  }
  return result.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const unMesAtras = new Date();
    unMesAtras.setMonth(unMesAtras.getMonth() - 1);
    const fechaLimite = unMesAtras.toISOString().split('T')[0];

    const ventas = await base44.asServiceRole.entities.Venta.filter({
      estado: 'Finalizada',
      postventaActiva: false
    }, '-created_date', 200);

    const ventasDelMes = ventas.filter(v => {
      const fechaVenta = v.fecha || (v.created_date || '').split('T')[0];
      return fechaVenta >= fechaLimite;
    });

    if (ventasDelMes.length === 0) {
      return Response.json({ ok: true, message: 'No hay ventas para actualizar', actualizadas: 0 });
    }

    const proximoSeguimiento = addBusinessDays(new Date(), 3);

    // Procesar de a 5 para evitar timeout
    let actualizadas = 0;
    for (let i = 0; i < ventasDelMes.length; i += 5) {
      const lote = ventasDelMes.slice(i, i + 5);
      await Promise.all(
        lote.map(v =>
          base44.asServiceRole.entities.Venta.update(v.id, {
            postventaActiva: true,
            postventaPaso: 0,
            postventaEstado: 'Pendiente',
            proximoSeguimientoPostventa: proximoSeguimiento
          })
        )
      );
      actualizadas += lote.length;
    }

    return Response.json({
      ok: true,
      actualizadas,
      ids: ventasDelMes.map(v => v.id)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
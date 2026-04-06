import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    const payload = await req.json();
    const { event, data, old_data, payload_too_large } = payload;

    if (!['create', 'update'].includes(event?.type)) return Response.json({ ok: true, reason: 'not_relevant_event' });

    if (payload_too_large) {
      return Response.json({ ok: true, reason: 'payload_too_large_skipped' });
    }

    // Solo ventas Finalizadas
    if (data?.estado !== 'Finalizada') return Response.json({ ok: true, reason: 'not_finalizada' });
    // En updates, solo cuando recién cambia a Finalizada
    if (event.type === 'update' && old_data?.estado === 'Finalizada') return Response.json({ ok: true, reason: 'already_finalizada' });
    // Si ya se activó postventa, no re-activar
    if (data?.postventaActiva === true) return Response.json({ ok: true, reason: 'postventa_already_active' });

    const proximoSeguimiento = addBusinessDays(new Date(), 3);

    await base44.asServiceRole.entities.Venta.update(event.entity_id, {
      postventaActiva: true,
      postventaPaso: 0,
      postventaEstado: 'Pendiente',
      proximoSeguimientoPostventa: proximoSeguimiento
    });

    return Response.json({ ok: true, proximoSeguimiento });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});